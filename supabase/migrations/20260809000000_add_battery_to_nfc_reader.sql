-- ==========================================
-- UMCA - TAMBAH KOLOM BATERAI PADA NfcReader
-- Jalankan seluruh script ini di SQL Editor Supabase
-- ==========================================

-- 1. Tambah kolom baterai (jalan sekali, aman diulang dengan IF NOT EXISTS)
alter table "NfcReader"
  add column if not exists "batteryPct" integer,
  add column if not exists "batteryVoltage" double precision;

-- 2. Update RPC umca_reader_heartbeat agar menerima & menyimpan data baterai
drop function if exists public.umca_reader_heartbeat(text, text, boolean);

create or replace function public.umca_reader_heartbeat(
  device_id text,
  device_secret text,
  connected boolean default true,
  battery_pct integer default null,
  battery_voltage double precision default null
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
  set "lastSeenAt" = case when connected then now() else null end,
      "batteryPct" = case when connected then battery_pct else "batteryPct" end,
      "batteryVoltage" = case when connected then battery_voltage else "batteryVoltage" end
  where id = v_reader.id;

  return json_build_object(
    'success', true,
    'statusCode', 200,
    'data', json_build_object(
      'deviceId', device_id,
      'connected', connected,
      'batteryPct', battery_pct,
      'batteryVoltage', battery_voltage
    )
  );
end;
$$;

grant execute on function public.umca_reader_heartbeat(text, text, boolean, integer, double precision) to anon, authenticated;
