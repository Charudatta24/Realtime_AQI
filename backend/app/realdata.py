"""
Real-time air quality data fetcher using the Open-Meteo Air Quality API.
Free, no API key required. Backed by Copernicus Atmosphere Monitoring Service (CAMS).

Computes India's National AQI (NAQI) from raw pollutant concentrations using
the official CPCB breakpoint formula, NOT a rough US AQI conversion.

Docs: https://open-meteo.com/en/docs/air-quality-api
CPCB AQI: https://cpcb.nic.in/National-Air-Quality-Index/
"""
import urllib.request
import json
from datetime import datetime
from app.config import CITIES

# Cache fetched readings so we don't spam the API on every request
_realdata_cache = {}
CACHE_TTL_SECONDS = 900  # refresh every 15 minutes
_coord_cache = {}


# ================================================================
# India National AQI (NAQI) Computation — CPCB Standard Breakpoints
# ================================================================
# Each entry: (C_low, C_high, I_low, I_high)
# Where C = pollutant concentration, I = AQI sub-index
# Formula: I = [(I_high - I_low)/(C_high - C_low)] * (C - C_low) + I_low

_PM25_BP = [(0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200),
            (91, 120, 201, 300), (121, 250, 301, 400), (251, 9999, 401, 500)]
_PM10_BP = [(0, 50, 0, 50), (51, 100, 51, 100), (101, 250, 101, 200),
            (251, 350, 201, 300), (351, 430, 301, 400), (431, 9999, 401, 500)]
_NO2_BP  = [(0, 40, 0, 50), (41, 80, 51, 100), (81, 180, 101, 200),
            (181, 280, 201, 300), (281, 400, 301, 400), (401, 9999, 401, 500)]
_SO2_BP  = [(0, 40, 0, 50), (41, 80, 51, 100), (81, 380, 101, 200),
            (381, 800, 201, 300), (801, 1600, 301, 400), (1601, 9999, 401, 500)]
_CO_BP   = [(0, 1.0, 0, 50), (1.1, 2.0, 51, 100), (2.1, 10.0, 101, 200),
            (10.1, 17.0, 201, 300), (17.1, 34.0, 301, 400), (34.1, 9999, 401, 500)]
_O3_BP   = [(0, 50, 0, 50), (51, 100, 51, 100), (101, 168, 101, 200),
            (169, 208, 201, 300), (209, 748, 301, 400), (749, 9999, 401, 500)]


def _compute_subindex(concentration, breakpoints):
    """
    Compute AQI sub-index for a single pollutant using CPCB breakpoints.

    CPCB breakpoints are defined with integer boundaries separated by 1-unit gaps
    (e.g. 0-30, 31-60, 61-90, 91-120). The standard convention rounds the raw
    concentration to the nearest integer before applying the formula.
    """
    if concentration is None or concentration < 0:
        return None

    # Round to nearest integer to align with CPCB integer breakpoints
    conc_rounded = round(concentration)

    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= conc_rounded <= c_high:
            # Linear interpolation using the rounded concentration
            sub_idx = ((i_high - i_low) / (c_high - c_low)) * (conc_rounded - c_low) + i_low
            return round(sub_idx)

    # Fallback: if concentration exceeds all breakpoints, cap at 500
    if concentration > breakpoints[-1][1]:
        return breakpoints[-1][3]
    return None


def compute_india_aqi(pm25=None, pm10=None, no2=None, so2=None, co=None, o3=None):
    """
    Compute India's National AQI (0-500) from raw pollutant concentrations.
    The overall AQI is the maximum of all sub-indices.

    Returns:
        dict with 'aqi' (int), 'primary_pollutant' (str), and all sub-indices.
        On failure, returns None.
    """
    sub_indices = {}

    if pm25 is not None:
        sub_indices["PM2.5"] = _compute_subindex(pm25, _PM25_BP)
    if pm10 is not None:
        sub_indices["PM10"] = _compute_subindex(pm10, _PM10_BP)
    if no2 is not None:
        sub_indices["NO₂"] = _compute_subindex(no2, _NO2_BP)
    if so2 is not None:
        sub_indices["SO₂"] = _compute_subindex(so2, _SO2_BP)
    if co is not None:
        sub_indices["CO"] = _compute_subindex(co, _CO_BP)
    if o3 is not None:
        sub_indices["O₃"] = _compute_subindex(o3, _O3_BP)

    # Filter out None values
    valid = {k: v for k, v in sub_indices.items() if v is not None}

    if not valid:
        return None

    aqi = max(valid.values())
    # Clamp to 0-500
    aqi = max(0, min(500, aqi))

    # Primary pollutant: the one whose sub-index equals AQI (highest wins; tie-break by PM2.5 > PM10 > NO2 > others)
    primary_priority = ["PM2.5", "PM10", "NO₂", "SO₂", "CO", "O₃"]
    primary = None
    for p in primary_priority:
        if valid.get(p) == aqi:
            primary = p
            break
    if not primary and valid:
        primary = max(valid, key=valid.get)

    return {
        "india_aqi": aqi,
        "primary_pollutant": primary,
        "sub_indices": valid,
    }


def _fetch_openmeteo(lat: float, lon: float) -> dict:
    """
    Call Open-Meteo Air Quality API and return current readings and hourly forecast.
    Falls back to None on any network / parse error.
    """
    url = (
        "https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={lat}&longitude={lon}"
        "&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,"
        "sulphur_dioxide,ozone,us_aqi,european_aqi"
        "&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,"
        "sulphur_dioxide,ozone,us_aqi,european_aqi"
        "&timezone=auto"
        "&domains=cams_global"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AeroVigil/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = json.loads(resp.read().decode())
        cur = raw.get("current", {})
        hourly = raw.get("hourly", {})

        pm25 = cur.get("pm2_5")
        pm10 = cur.get("pm10")
        # Open-Meteo returns gases in µg/m³ already
        no2 = cur.get("nitrogen_dioxide")
        so2 = cur.get("sulphur_dioxide")
        co_raw = cur.get("carbon_monoxide")  # µg/m³ — convert to mg/m³ by /1000
        o3 = cur.get("ozone")

        co_mg = round(co_raw / 1000.0, 2) if co_raw is not None else None

        # Compute India AQI from raw concentrations
        aqi_result = compute_india_aqi(pm25=pm25, pm10=pm10, no2=no2, so2=so2, co=co_mg, o3=o3)

        return {
            "pm25":        pm25,
            "pm10":        pm10,
            "no2":         no2,
            "so2":         so2,
            "co":          co_raw,          # µg/m³ (raw from API)
            "co_mg":       co_mg,           # mg/m³ (for AQI computation)
            "o3":          o3,
            "us_aqi":      cur.get("us_aqi"),
            "european_aqi": cur.get("european_aqi"),
            "source":      "Open-Meteo / CAMS",
            "fetched_at":  datetime.now().isoformat(),
            "hourly":      hourly,          # Include forecast hourly series
            **aqi_result,                   # india_aqi, primary_pollutant, sub_indices
        }
    except Exception as e:
        print(f"[realdata] Open-Meteo fetch failed for ({lat},{lon}): {e}")
        return None


def get_realtime_aqi(city_name: str) -> dict:
    """
    Returns the latest real-time AQI readings for one of the 21 configured cities.
    Uses a 15-minute cache to avoid hammering the API.
    Falls back to the static config baseline on error.

    The 'india_aqi' field is computed via CPCB breakpoint formula from
    raw pollutant concentrations — NOT converted from US AQI.
    """
    now = datetime.now()

    cached = _realdata_cache.get(city_name)
    if cached:
        age = (now - datetime.fromisoformat(cached["data"]["fetched_at"])).total_seconds()
        if age < CACHE_TTL_SECONDS:
            return cached["data"]

    city_cfg = CITIES.get(city_name)
    if not city_cfg:
        return _fallback(city_name)

    lat = city_cfg["lat_center"]
    lon = city_cfg["lon_center"]

    raw = _fetch_openmeteo(lat, lon)
    if raw is None or raw.get("india_aqi") is None:
        return _fallback(city_name)

    result = {
        **raw,
        "city": city_name,
        "lat": lat,
        "lon": lon,
    }

    _realdata_cache[city_name] = {"data": result}
    print(f"[realdata] {city_name}: India-AQI={raw['india_aqi']} (primary={raw['primary_pollutant']}), "
          f"PM2.5={raw['pm25']} ug/m3, PM10={raw['pm10']} ug/m3, US-AQI={raw['us_aqi']}")
    return result


def get_aqi_for_coordinates(lat: float, lon: float) -> dict:
    """
    Returns live AQI for ANY lat/lng in India (or anywhere) — not limited to the
    21 configured cities. Uses the official CPCB AQI formula.
    Cached per ~1km cell for 15 minutes.
    """
    now = datetime.now()
    cache_key = f"{round(lat, 2)},{round(lon, 2)}"

    cached = _coord_cache.get(cache_key)
    if cached:
        age = (now - datetime.fromisoformat(cached["fetched_at"])).total_seconds()
        if age < CACHE_TTL_SECONDS:
            return cached

    raw = _fetch_openmeteo(lat, lon)
    if raw is None or raw.get("india_aqi") is None:
        result = {
            "india_aqi": 100,
            "primary_pollutant": "PM2.5",
            "sub_indices": {"PM2.5": 100},
            "pm25": 62,
            "pm10": 115,
            "no2": 30.0,
            "so2": 12.0,
            "co": 800.0,
            "o3": 45.0,
            "us_aqi": 100,
            "european_aqi": None,
            "source": "Fallback (no data for this location)",
            "fetched_at": now.isoformat(),
            "lat": lat,
            "lon": lon,
        }
        _coord_cache[cache_key] = result
        return result

    result = {
        **raw,
        "lat": lat,
        "lon": lon,
    }
    _coord_cache[cache_key] = result
    print(f"[realdata] coords ({lat},{lon}): India-AQI={raw['india_aqi']} (primary={raw['primary_pollutant']})")
    return result


def _fallback(city_name: str) -> dict:
    """Returns static config baseline if live fetch fails."""
    cfg = CITIES.get(city_name, {})
    bg = cfg.get("bg_aqi", 120)
    return {
        "india_aqi":   bg,
        "primary_pollutant": "PM2.5",
        "sub_indices": {"PM2.5": bg, "PM10": round(bg * 0.95)},
        "pm25":        round(bg * 0.62),
        "pm10":        round(bg * 1.15),
        "no2":         30.0,
        "so2":         12.0,
        "co":          800.0,
        "co_mg":       0.8,
        "o3":          45.0,
        "us_aqi":      bg,
        "european_aqi": None,
        "source":      "Static Fallback (Open-Meteo unavailable)",
        "fetched_at":  datetime.now().isoformat(),
        "city":        city_name,
    }


def get_forecast_aqi(city_name: str, target_time: datetime) -> dict:
    """
    Returns the forecast AQI and raw pollutants for a given target_time
    by picking the hour index from the hourly Copernicus/CAMS forecast array.
    """
    # Fetch realtime city reading (populates the cache, including hourly array)
    city_data = get_realtime_aqi(city_name)
    if not city_data or "hourly" not in city_data:
        return _fallback(city_name)

    hourly = city_data["hourly"]
    times = hourly.get("time", [])
    if not times:
        return _fallback(city_name)

    # Find closest hourly timestamp
    target_str = target_time.strftime("%Y-%m-%dT%H:00")
    idx = -1
    for i, t in enumerate(times):
        if t.startswith(target_str[:13]):
            idx = i
            break

    if idx == -1:
        # Fallback to closest math difference
        min_diff = float('inf')
        for i, t in enumerate(times):
            try:
                dt = datetime.fromisoformat(t)
                diff = abs((dt - target_time).total_seconds())
                if diff < min_diff:
                    min_diff = diff
                    idx = i
            except Exception:
                continue

    if idx == -1 or idx >= len(times):
        return _fallback(city_name)

    # Extract concentrations at index
    pm25 = hourly.get("pm2_5", [])[idx] if idx < len(hourly.get("pm2_5", [])) else None
    pm10 = hourly.get("pm10", [])[idx] if idx < len(hourly.get("pm10", [])) else None
    no2 = hourly.get("nitrogen_dioxide", [])[idx] if idx < len(hourly.get("nitrogen_dioxide", [])) else None
    so2 = hourly.get("sulphur_dioxide", [])[idx] if idx < len(hourly.get("sulphur_dioxide", [])) else None
    co_raw = hourly.get("carbon_monoxide", [])[idx] if idx < len(hourly.get("carbon_monoxide", [])) else None
    o3 = hourly.get("ozone", [])[idx] if idx < len(hourly.get("ozone", [])) else None

    co_mg = round(co_raw / 1000.0, 2) if co_raw is not None else None

    # Compute India AQI from raw concentrations at that hour
    aqi_result = compute_india_aqi(pm25=pm25, pm10=pm10, no2=no2, so2=so2, co=co_mg, o3=o3)
    if not aqi_result:
        return _fallback(city_name)

    return {
        "pm25":        pm25,
        "pm10":        pm10,
        "no2":         no2,
        "so2":         so2,
        "co":          co_raw,
        "co_mg":       co_mg,
        "o3":          o3,
        "india_aqi":   aqi_result["india_aqi"],
        "primary_pollutant": aqi_result["primary_pollutant"],
        "sub_indices": aqi_result["sub_indices"],
        "source":      "Open-Meteo Forecast / CAMS",
        "fetched_at":  city_data["fetched_at"],
        "city":        city_name,
    }

