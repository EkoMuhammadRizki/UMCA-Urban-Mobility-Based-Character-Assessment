create extension if not exists pgcrypto;

create or replace function public.umca_reader_heartbeat(
  device_id text,
  device_secret text,
  connected boolean default true
)
returns json
language plpgsql
security definer
as $$
declare
  v_reader record;
begin
  select *
  into v_reader
  from public."NfcReader"
  where "deviceId" = device_id
  limit 1;

  if v_reader is null then
    return json_build_object('success', false, 'statusCode', 404, 'error', 'Perangkat Reader tidak terdaftar.');
  end if;

  if coalesce(v_reader."isActive", false) = false then
    return json_build_object('success', false, 'statusCode', 401, 'error', 'Perangkat Reader dinonaktifkan.');
  end if;

  if v_reader."secretKey" is distinct from device_secret then
    return json_build_object('success', false, 'statusCode', 401, 'error', 'Kredensial Perangkat Tap Reader tidak cocok.');
  end if;

  update public."NfcReader"
  set "lastSeenAt" = case when connected then now() else null end
  where id = v_reader.id;

  return json_build_object('success', true, 'statusCode', 200, 'data', json_build_object('deviceId', device_id, 'connected', connected));
end;
$$;

create or replace function public.umca_attendance_tap(
  device_id text,
  device_secret text,
  nfc_tag_id text,
  moda_transport text default null,
  client_timestamp text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_reader record;
  v_siswa record;
  v_sekolah record;
  v_tap_ts timestamptz;
  v_local_ts timestamp;
  v_tanggal date;
  v_jam time;
  v_threshold time;
  v_status text;
  v_new_id uuid;
  v_new_record record;
begin
  select *
  into v_reader
  from public."NfcReader"
  where "deviceId" = device_id
  limit 1;

  if v_reader is null then
    return json_build_object('success', false, 'statusCode', 404, 'error', format('Perangkat Reader dengan ID %s tidak terdaftar.', device_id));
  end if;

  if coalesce(v_reader."isActive", false) = false then
    return json_build_object('success', false, 'statusCode', 401, 'error', 'Perangkat Reader dinonaktifkan oleh administrator.');
  end if;

  if v_reader."secretKey" is distinct from device_secret then
    return json_build_object('success', false, 'statusCode', 401, 'error', 'Kredensial Perangkat Tap Reader tidak cocok.');
  end if;

  if nfc_tag_id is null or btrim(nfc_tag_id) = '' then
    return json_build_object('success', false, 'statusCode', 400, 'error', 'nfcTagId wajib diisi.');
  end if;

  select *
  into v_siswa
  from public."Siswa"
  where "nfcTagId" = nfc_tag_id
  limit 1;

  if v_siswa is null then
    return json_build_object('success', false, 'statusCode', 404, 'error', format('Kartu NFC %s belum terdaftar.', nfc_tag_id));
  end if;

  if v_reader."sekolahId" is distinct from v_siswa."sekolahId" then
    return json_build_object('success', false, 'statusCode', 400, 'error', 'Perangkat Reader diletakkan di sekolah yang salah.');
  end if;

  select *
  into v_sekolah
  from public."Sekolah"
  where id = v_siswa."sekolahId"
  limit 1;

  if v_sekolah is null then
    return json_build_object('success', false, 'statusCode', 404, 'error', 'Sekolah asal siswa tidak ditemukan.');
  end if;

  v_tap_ts := now();
  v_local_ts := (v_tap_ts at time zone 'Asia/Jakarta');

  if extract(isodow from v_local_ts) in (6, 7) then
    return json_build_object('success', false, 'statusCode', 403, 'error', 'Absensi hanya dapat dicatat pada hari Senin - Jumat.');
  end if;

  v_tanggal := date(v_local_ts);
  v_jam := time(v_local_ts);

  if v_jam < time '06:30' or v_jam > time '11:00' then
    return json_build_object(
      'success', false,
      'statusCode', 403,
      'error', format('Tap ditolak. Absensi hanya diterima antara pukul 06:30 - 11:00. Waktu tap: %s.', to_char(v_jam, 'HH24:MI'))
    );
  end if;

  v_threshold := coalesce(nullif(v_sekolah."jamMasuk", '')::time, time '06:30');
  if v_jam <= v_threshold then
    v_status := 'TEPAT_WAKTU';
  else
    v_status := 'TELAT';
  end if;

  v_new_id := gen_random_uuid();

  begin
    insert into public."Kehadiran" (
      id,
      "siswaId",
      tanggal,
      "jamTap",
      status,
      "modaTransport",
      "haltId",
      "titikTap",
      "nfcReaderId"
    ) values (
      v_new_id,
      v_siswa.id,
      v_tanggal,
      v_tap_ts,
      v_status,
      moda_transport,
      case when v_reader."titikTap" = 'HALTE' then 'halt-001' else null end,
      v_reader."titikTap",
      v_reader.id
    )
    returning * into v_new_record;
  exception
    when unique_violation then
      return json_build_object(
        'success', false,
        'statusCode', 409,
        'error', format('Siswa %s sudah melakukan tap hari ini.', v_siswa.nama)
      );
  end;

  update public."NfcReader"
  set "lastSeenAt" = v_tap_ts
  where id = v_reader.id;

  return json_build_object(
    'success', true,
    'statusCode', 201,
    'message', 'Absensi berhasil dicatat.',
    'data', json_build_object(
      'id', v_new_record.id,
      'siswa', json_build_object('id', v_siswa.id, 'nama', v_siswa.nama, 'kelas', v_siswa.kelas),
      'tanggal', v_new_record.tanggal,
      'jamTap', v_new_record."jamTap",
      'status', v_new_record.status,
      'titikTap', v_new_record."titikTap",
      'modaTransport', v_new_record."modaTransport"
    )
  );
end;
$$;

grant execute on function public.umca_reader_heartbeat(text, text, boolean) to anon, authenticated;
grant execute on function public.umca_attendance_tap(text, text, text, text, text) to anon, authenticated;

