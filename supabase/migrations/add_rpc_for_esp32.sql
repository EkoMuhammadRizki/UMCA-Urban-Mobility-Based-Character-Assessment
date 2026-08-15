create extension if not exists pgcrypto;

-- Tambahkan kolom untuk menyimpan UID yang terakhir discan
alter table public."NfcReader" add column if not exists "lastScannedUid" text;
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

  -- Simpan setiap UID yang discan ke alat pembaca (NfcReader)
  update public."NfcReader"
  set "lastScannedUid" = nfc_tag_id,
      "lastSeenAt" = now()
  where id = v_reader.id;

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

  -- Ambil nama hari dalam bahasa Indonesia
  -- 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
  declare
    v_dow int;
    v_day_name text;
    v_rule jsonb;
    v_tenggat_str text;
    v_jam_masuk_str text;
  begin
    v_dow := extract(dow from v_local_ts)::int;
    v_day_name := case v_dow
      when 0 then 'Minggu'
      when 1 then 'Senin'
      when 2 then 'Selasa'
      when 3 then 'Rabu'
      when 4 then 'Kamis'
      when 5 then 'Jumat'
      when 6 then 'Sabtu'
    end;

    v_tanggal := v_local_ts::date;
    v_jam := v_local_ts::time;

    -- Cari aturan jam berdasarkan hari ini dari kolom aturanJam
    v_threshold := coalesce(nullif(v_sekolah."jamMasuk", '')::time, time '07:00');
    
    if v_sekolah."aturanJam" is not null and jsonb_typeof(v_sekolah."aturanJam"::jsonb) = 'array' then
      -- Cek rule spesifik per hari
      select elem into v_rule
      from jsonb_array_elements(v_sekolah."aturanJam"::jsonb) as elem
      where elem->>'hari' = v_day_name
      limit 1;

      if v_rule is not null then
        v_tenggat_str := coalesce(v_rule->>'tenggat', v_rule->>'jamMasuk');
        if v_tenggat_str is not null and v_tenggat_str <> '' then
          v_threshold := v_tenggat_str::time;
        end if;
      end if;
    end if;

    if v_jam <= v_threshold then
      v_status := 'TEPAT_WAKTU';
    else
      v_status := 'TELAT';
    end if;
  end;

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

