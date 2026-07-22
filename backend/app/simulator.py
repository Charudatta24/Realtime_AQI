import numpy as np
import pandas as pd
import math
from datetime import datetime, timedelta
from app.config import CITIES, DEFAULT_EMISSION_CALENDAR, GRID_ROWS, GRID_COLS

# Set random seed for reproducibility
np.random.seed(42)

class CitySimulator:
    def __init__(self, name: str):
        if name not in CITIES:
            raise ValueError(f"Unknown city: {name}")
        self.name = name
        self.config = CITIES[name]
        
        # Define fixed geospatial features for this city
        # Industrial stacks: (row, col, emission_strength)
        self.industries = self._init_industries()
        # High traffic highways: list of cells (row, col)
        self.highways = self._init_highways()
        # Active construction projects: (row, col, dust_strength)
        self.construction_sites = self._init_construction()
        # Monitoring stations (CAAQMS): (row, col, name)
        self.stations = self._init_stations()
        
    def _init_industries(self):
        # Specific placements per city to create interesting geospatial shapes
        if self.name == "Delhi":
            return [(2, 2, 180), (3, 7, 220), (7, 1, 150)]  # Okhla, Bawana, Mayapuri type zones
        elif self.name == "Mumbai":
            return [(4, 8, 250), (8, 6, 120)]  # Chembur refinery / port areas
        elif self.name == "Bengaluru":
            return [(1, 8, 120), (8, 2, 100)]  # Peenya, Electronic City industrial borders
        elif self.name == "Chennai":
            return [(1, 5, 240), (2, 8, 140)]  # Ennore port, Manali industrial area
        else: # Kolkata
            return [(3, 1, 190), (6, 8, 130)]  # Howrah / Haldia industrial direction
            
    def _init_highways(self):
        # Simulating linear road networks across the grid
        highways = []
        if self.name == "Delhi":
            # Outer Ring Road (circularish/diagonal) + NH44
            for i in range(10):
                highways.append((i, i))  # Diagonal NH
                highways.append((4, i))  # Ring road horizontal slice
        elif self.name == "Mumbai":
            # Vertical coastal/expressway corridors
            for i in range(10):
                highways.append((i, 3))  # Western Express Highway
                highways.append((i, 6))  # Eastern Express Highway
        elif self.name == "Bengaluru":
            # Ring road shape (outer border cells)
            for i in range(1, 9):
                highways.append((i, 1))
                highways.append((i, 8))
                highways.append((1, i))
                highways.append((8, i))
        elif self.name == "Chennai":
            # Grid-like highway structure
            for i in range(10):
                highways.append((i, 4))  # GST Road / Port access
                highways.append((5, i))
        else: # Kolkata
            # E.M. Bypass (Eastern side vertical) and central flyovers
            for i in range(10):
                highways.append((i, 7))
                highways.append((5, i))
        return list(set(highways))
        
    def _init_construction(self):
        # A few ongoing major construction hotspots (e.g. Metro rail)
        if self.name == "Delhi":
            return [(1, 4, 80), (5, 6, 110), (8, 3, 90)]
        elif self.name == "Mumbai":
            return [(2, 2, 140), (5, 5, 120), (7, 4, 150)]  # Coastal road / Metro sites
        elif self.name == "Bengaluru":
            return [(3, 3, 130), (4, 6, 90), (7, 7, 100)]  # Tech park expansions
        elif self.name == "Chennai":
            return [(3, 2, 70), (6, 6, 120)]
        else: # Kolkata
            return [(4, 4, 80), (8, 2, 110)]
            
    def _init_stations(self):
        # 5 CAAQMS monitoring stations scattered across grid
        lat_c = self.config["lat_center"]
        lon_c = self.config["lon_center"]
        
        station_offsets = [
            (2, 2, "North-West Station"),
            (2, 7, "North-East Station"),
            (5, 5, "Central Square Station"),
            (7, 3, "South-West Station"),
            (8, 8, "South-East Station")
        ]
        
        stations = []
        for r, c, sname in station_offsets:
            # Approx delta lat/lon (1 grid cell ~ 0.009 degrees lat, ~ 0.010 degrees lon)
            lat = lat_c + (r - 4.5) * 0.009
            lon = lon_c + (c - 4.5) * 0.010
            stations.append({
                "id": f"{self.name.lower()}_station_{r}_{c}",
                "name": f"{self.name} {sname}",
                "row": r,
                "col": c,
                "lat": round(lat, 5),
                "lon": round(lon, 5)
            })
        return stations

    def get_seasonal_emissions(self, timestamp: datetime):
        month = timestamp.month
        calendar = self.config.get("emission_calendar", DEFAULT_EMISSION_CALENDAR)
        return {
            "residential": calendar["residential"][month - 1],
            "industrial": calendar["industrial"][month - 1],
            "agricultural": calendar["agricultural"][month - 1]
        }

    def get_traffic_profile(self, timestamp: datetime):
        hour = timestamp.hour
        weekday = timestamp.weekday()

        if 8 <= hour <= 11 or 17 <= hour <= 20:
            base = 1.9
            peak = "Peak"
        elif 22 <= hour or hour <= 5:
            base = 0.35
            peak = "Low"
        else:
            base = 1.0
            peak = "Shoulder"

        weekend_factor = 0.85 if weekday >= 5 else 1.0
        seasonal_factor = self.get_seasonal_emissions(timestamp)["residential"]
        highway_volume = round(base * weekend_factor * seasonal_factor, 2)
        local_load = round(0.85 * highway_volume, 2)

        return {
            "traffic_volume": highway_volume,
            "local_traffic_load": local_load,
            "peak_period": peak,
            "weekday": weekday,
            "seasonal_residential_factor": seasonal_factor
        }

    def get_meteorology(self, timestamp: datetime):
        # Simulate weather values varying smoothly by time of day
        hour = timestamp.hour
        # Diurnal temperature cycle: peaks at 15:00, coolest at 05:00
        temp_cycle = math.sin((hour - 9) * 2 * math.pi / 24)
        temperature = 22 + 8 * temp_cycle  # range 14 - 30 C
        
        # Humidity: inverse to temperature
        humidity = 60 - 25 * temp_cycle  # range 35 - 85 %
        
        # Wind Speed (m/s): usually drops during night/early morning (inversion)
        wind_cycle = math.sin((hour - 12) * 2 * math.pi / 24)
        wind_speed = 3.0 + 1.8 * wind_cycle + np.random.uniform(-0.5, 0.5)
        wind_speed = max(0.5, wind_speed)  # minimum wind speed
        
        # Wind Direction (degrees 0-360)
        # Coastal cities: sea-land breeze rotation. Inland: prevailing wind with diurnal drift
        if self.name in ["Mumbai", "Chennai", "Surat", "Kochi", "Visakhapatnam", "Nashik"]:
            # Sea-land breeze rotation: 270 (W, sea) in afternoon, 90 (E, land) at night
            wind_dir = 180 + 90 * math.sin((hour - 12) * 2 * math.pi / 24)
        else:
            # Prevailing winds with minor diurnal drift — mapped for all cities
            _base_winds = {
                "Delhi": 300, "Bengaluru": 250, "Kolkata": 220,
                "Hyderabad": 260, "Pune": 270, "Ahmedabad": 290,
                "Jaipur": 280, "Lucknow": 270, "Indore": 280,
                "Nagpur": 260, "Bhopal": 270, "Vadodara": 280,
                "Chandigarh": 290, "Patna": 250, "Ranchi": 240,
            }
            base_dir = _base_winds.get(self.name, 260)
            wind_dir = base_dir + 30 * math.sin(hour * 2 * math.pi / 24)
            
        wind_dir = int(wind_dir % 360)
        
        # Boundary Layer / Mixing Height (meters): collapses at night, trapping pollutants
        # range 200m at night to 1500m in afternoon
        mixing_height = 800 + 600 * temp_cycle
        
        return {
            "temperature": round(temperature, 1),
            "humidity": int(humidity),
            "wind_speed": round(wind_speed * 3.6, 1),  # convert to km/h
            "wind_direction": wind_dir,
            "mixing_height": int(mixing_height)
        }

    def get_satellite_anomalies(self, timestamp: datetime):
        # Simulates satellite thermal anomalies (e.g. crop burning or waste fires)
        # Higher count in Delhi (stubble burning season simulated in mock), waste fires in others
        anomalies = []
        hour = timestamp.hour
        
        # Seed generator based on day/hour to keep consecutive requests stable
        np_state = np.random.get_state()
        seed = int(timestamp.strftime("%Y%m%d%H"))
        np.random.seed(seed)
        
        # Determine number of fires — all 21 cities mapped
        _fire_base = {
            "Delhi": 4, "Kolkata": 2, "Mumbai": 1, "Bengaluru": 1, "Chennai": 0,
            "Hyderabad": 0, "Pune": 0, "Ahmedabad": 0, "Jaipur": 1, "Lucknow": 1,
            "Indore": 0, "Surat": 0, "Nagpur": 0, "Kochi": 0, "Visakhapatnam": 0,
            "Bhopal": 1, "Vadodara": 1, "Chandigarh": 1, "Nashik": 0, "Patna": 1,
            "Ranchi": 1,
        }
        base_fires = _fire_base.get(self.name, 0)
        # Burning is usually detected in afternoon (MODIS orbits around 13:30 local)
        active_fires_count = base_fires
        if 11 <= hour <= 17:
            active_fires_count += np.random.randint(1, 3)
            
        for i in range(active_fires_count):
            r = np.random.randint(0, GRID_ROWS)
            c = np.random.randint(0, GRID_COLS)
            frp = np.random.uniform(5.0, 45.0)  # Fire Radiative Power (MW)
            anomalies.append({
                "row": r,
                "col": c,
                "frp": round(frp, 1),
                "type": "Stubble Burning" if self.name == "Delhi" and r < 3 else "Waste Burning"
            })
            
        np.random.set_state(np_state)
        return anomalies

    def generate_grid_state(self, timestamp: datetime):
        # Generate complete state of grid cells
        meteo = self.get_meteorology(timestamp)
        anomalies = self.get_satellite_anomalies(timestamp)
        seasonal = self.get_seasonal_emissions(timestamp)
        traffic = self.get_traffic_profile(timestamp)
        
        # Core AQI contribution matrices
        base_aqi = self.config["bg_aqi"] * seasonal["residential"]
        
        # Diurnal baseline multiplier (higher emissions during peak hours 8-11am and 6-9pm)
        hour = timestamp.hour
        diurnal_factor = 1.0
        if 8 <= hour <= 11:
            diurnal_factor = 1.35
        elif 18 <= hour <= 21:
            diurnal_factor = 1.45
        elif 2 <= hour <= 5:
            diurnal_factor = 0.75
                 # 1. Base grid containing smooth gradient background
        grid_aqi = np.ones((GRID_ROWS, GRID_COLS)) * base_aqi * diurnal_factor
        
        # 1b. Simulate vehicle density and location sharing users
        grid_vehicles = np.zeros((GRID_ROWS, GRID_COLS))
        grid_location_users = np.zeros((GRID_ROWS, GRID_COLS))
        
        # Base background traffic
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                # minor baseline traffic
                grid_vehicles[r, c] = np.random.randint(2, 8)
        
        # Add traffic on highways based on traffic volume
        traffic_volume = traffic["traffic_volume"]
        local_traffic_load = traffic["local_traffic_load"]
        
        for r, c in self.highways:
            # 40-100 vehicles on highways during peaks
            grid_vehicles[r, c] += int(50 * traffic_volume + np.random.randint(5, 15))
            # Diffuse traffic load slightly to adjacent grid cells
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if 0 <= r+dr < GRID_ROWS and 0 <= c+dc < GRID_COLS:
                        if (r+dr, c+dc) not in self.highways:
                            grid_vehicles[r+dr, c+dc] += int(12 * local_traffic_load + np.random.randint(1, 4))
        
        # Add extra vehicles near construction sites (trucks, machinery)
        for r, c, strength in self.construction_sites:
            activity = 1.2 if 8 <= hour <= 18 else 0.2
            grid_vehicles[r, c] += int(strength * 0.15 * activity)
            
        # Compute location users based on vehicle counts (simulating location-sharing citizens)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                # 15-35% of vehicle occupants share their location, plus some pedestrians
                opt_in_rate = np.random.uniform(0.15, 0.35)
                grid_location_users[r, c] = int(grid_vehicles[r, c] * opt_in_rate + np.random.randint(1, 5))
        
        # 2. Add highway traffic AQI contribution (proportional to vehicle count)
        for r in range(GRID_ROWS):
            for c in range(GRID_COLS):
                # each vehicle adds 0.85 points to cell AQI
                grid_aqi[r, c] += grid_vehicles[r, c] * 0.85
                        
        # 3. Add Construction Dust contribution
        for r, c, strength in self.construction_sites:
            # Construction activity profile (mostly daytime)
            activity = 1.2 if 8 <= hour <= 18 else 0.2
            grid_aqi[r, c] += strength * activity
            # Spills over slightly to adjacent cells
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if 0 <= r+dr < GRID_ROWS and 0 <= c+dc < GRID_COLS:
                        grid_aqi[r+dr, c+dc] += strength * 0.25 * activity
 
        # 4. Add Satellite Biomass/Waste burning fire contribution
        for fire in anomalies:
            r, c = fire["row"], fire["col"]
            frp = fire["frp"]
            seasonal_agri = seasonal["agricultural"]
            grid_aqi[r, c] += frp * 4.0 * seasonal_agri
            
        # 5. Dispersion of Industrial stacks & fires (Plume model simulation)
        # Plume calculations: wind blows pollutants downwind
        wind_speed_kmh = meteo["wind_speed"]
        wind_dir_deg = meteo["wind_direction"]
        
        # Convert wind direction from meteorological (degrees from North) to math angle (radians vector)
        # e.g., 0 deg (wind from North) means blowing Southward (dx=0, dy=-1)
        wind_rad = math.radians((270 - wind_dir_deg) % 360)
        wind_dx = math.cos(wind_rad)
        wind_dy = math.sin(wind_rad)
        
        # Plume parameters: lower wind speed = higher concentration (less dilution)
        dilution_factor = max(0.2, 5.0 / (wind_speed_kmh + 1.0))
        
        # Combine industries and active fires into emission point sources
        emission_sources = [(r, c, strength * dilution_factor, "industry") for r, c, strength in self.industries]
        for fire in anomalies:
            r, c = fire["row"], fire["col"]
            frp = fire["frp"]
            emission_sources.append((r, c, frp * 5.0 * dilution_factor, "fire"))
            
        for r_src, c_src, strength, src_type in emission_sources:
            for r in range(GRID_ROWS):
                for c in range(GRID_COLS):
                    # Distance vector from source
                    dy = r - r_src
                    dx = c - c_src
                    dist = math.sqrt(dx*dx + dy*dy)
                    if dist == 0:
                        grid_aqi[r, c] += strength
                        continue
                        
                    # Calculate projection along wind direction (downwind distance)
                    # Note: y coordinate goes down, so invert dy projection to align standard math grid
                    proj_downwind = (dx * wind_dx) + (dy * wind_dy)
                    
                    # Calculate crosswind distance (distance perpendicular to wind)
                    proj_crosswind = abs((dx * -wind_dy) + (dy * wind_dx))
                    
                    if proj_downwind > 0:  # Cell is downwind of source
                        # Gaussian dispersion approximation
                        # standard deviation expands downwind: sigma = a * x + b
                        sigma_y = 0.5 * proj_downwind + 0.2
                        plume_val = (strength / (math.sqrt(2 * math.pi) * sigma_y)) * math.exp(-(proj_crosswind**2) / (2 * (sigma_y**2)))
                        # Decay with distance
                        plume_val *= math.exp(-0.1 * proj_downwind)
                        grid_aqi[r, c] += plume_val
                        
        # 6. Apply Boundary Layer (Mixing Height) compression multiplier
        # Lower mixing height traps pollutants -> multiplier > 1.0
        # Normal reference height 800m
        mixing_multiplier = 800.0 / meteo["mixing_height"]
        # Clamp multiplier to reasonable bounds [0.8, 1.6]
        mixing_multiplier = max(0.8, min(1.6, mixing_multiplier))
        grid_aqi = grid_aqi * mixing_multiplier
        
        # Add random sensor noise/spatial fluctuation
        noise = np.random.normal(0, 5, (GRID_ROWS, GRID_COLS))
        grid_aqi = grid_aqi + noise
        
        # Get real-time accurate readings from Open-Meteo API (or Copernicus forecast if time is in future)
        from app.realdata import get_realtime_aqi, get_forecast_aqi
        now_dt = datetime.now(timestamp.tzinfo) if timestamp.tzinfo else datetime.now()
        time_diff = (timestamp - now_dt).total_seconds()
        if time_diff > 1800:  # target is > 30 minutes in the future
            real_data = get_forecast_aqi(self.name, timestamp)
        else:
            real_data = get_realtime_aqi(self.name)
        target_aqi = real_data.get("india_aqi", self.config["bg_aqi"])
        target_pm25 = real_data.get("pm25", target_aqi * 0.62)
        target_pm10 = real_data.get("pm10", target_aqi * 1.15)
        target_no2 = real_data.get("no2", 25.0)
        target_so2 = real_data.get("so2", 10.0)
        target_co = real_data.get("co_mg", 0.8)
        target_o3 = real_data.get("o3", 30.0)
        
        # Calibrate AQI Grid: shift entire grid so the mean matches target_aqi exactly
        mean_aqi = np.mean(grid_aqi)
        grid_aqi = grid_aqi - (mean_aqi - target_aqi)
        grid_aqi = np.clip(grid_aqi, 20, 500)
        grid_aqi = np.round(grid_aqi).astype(int)
        
        # Calculate calibrated sub-pollutants relative to live values
        # 1. PM2.5 Grid
        grid_pm25 = grid_aqi * 0.62 + np.random.uniform(-3, 3, (GRID_ROWS, GRID_COLS))
        mean_pm25 = np.mean(grid_pm25)
        grid_pm25 = np.clip(grid_pm25 - (mean_pm25 - target_pm25), 5, 500)
        
        # 2. PM10 Grid
        grid_pm10 = grid_aqi * 1.15 + np.random.uniform(-5, 5, (GRID_ROWS, GRID_COLS))
        mean_pm10 = np.mean(grid_pm10)
        grid_pm10 = np.clip(grid_pm10 - (mean_pm10 - target_pm10), 10, 800)
        
        # 3. NO2 Grid (peaks on highways)
        grid_no2 = np.ones((GRID_ROWS, GRID_COLS)) * target_no2
        for r, c in self.highways:
            grid_no2[r, c] += 40 * traffic_volume
        mean_no2 = np.mean(grid_no2)
        grid_no2 = np.clip(grid_no2 - (mean_no2 - target_no2), 2, 250)
        
        # 4. SO2 Grid (peaks near industries)
        grid_so2 = np.ones((GRID_ROWS, GRID_COLS)) * target_so2
        for r, c, strg in self.industries:
            grid_so2[r, c] += strg * 0.15
        mean_so2 = np.mean(grid_so2)
        grid_so2 = np.clip(grid_so2 - (mean_so2 - target_so2), 1, 150)
        
        # 5. CO Grid (peaks on highways, in mg/m3)
        grid_co = np.ones((GRID_ROWS, GRID_COLS)) * target_co
        for r, c in self.highways:
            grid_co[r, c] += 1.2 * traffic_volume
        mean_co = np.mean(grid_co)
        grid_co = np.clip(grid_co - (mean_co - target_co), 0.1, 10.0)
        
        # 6. O3 Grid (photochemical peak on hot sunny days)
        temp_factor = max(0.5, meteo["temperature"] / 25.0)
        grid_o3 = np.ones((GRID_ROWS, GRID_COLS)) * target_o3 * temp_factor
        mean_o3 = np.mean(grid_o3)
        grid_o3 = np.clip(grid_o3 - (mean_o3 - target_o3), 2, 200)

        
        # Format station data
        station_data = []
        for s in self.stations:
            r, c = s["row"], s["col"]
            aqi_val = int(grid_aqi[r, c])
            station_data.append({
                **s,
                "aqi": aqi_val,
                "pm25": int(max(5, grid_pm25[r, c])),
                "pm10": int(max(10, grid_pm10[r, c])),
                "no2": int(max(2, grid_no2[r, c])),
                "so2": int(max(1, grid_so2[r, c])),
                "co": round(max(0.1, grid_co[r, c]), 2),
                "o3": int(max(5, grid_o3[r, c])),
                "status": "Active" if np.random.rand() > 0.05 else "Maintenance" # 5% downtime
            })
            
        return {
            "city": self.name,
            "timestamp": timestamp.isoformat(),
            "meteorology": meteo,
            "seasonal_emissions": seasonal,
            "traffic_prediction": traffic,
            "grid_aqi": grid_aqi.tolist(),
            "grid_pm25": grid_pm25.clip(5, 500).tolist(),
            "grid_pm10": grid_pm10.clip(10, 800).tolist(),
            "grid_no2": grid_no2.clip(2, 250).tolist(),
            "grid_so2": grid_so2.clip(1, 150).tolist(),
            "grid_co": grid_co.clip(0.1, 10.0).tolist(),
            "grid_o3": grid_o3.clip(2, 200).tolist(),
            "grid_vehicles": grid_vehicles.tolist(),
            "grid_location_users": grid_location_users.tolist(),
            "stations": station_data,
            "satellite_fires": anomalies,
            "construction_sites": [{"row": r, "col": c, "strength": s} for r, c, s in self.construction_sites],
            "highways": [{"row": r, "col": c} for r, c in self.highways],
            "industries": [{"row": r, "col": c, "emission": s} for r, c, s in self.industries]
        }

# Cache simulator instances
_simulators = {}

def get_simulator(city_name: str) -> CitySimulator:
    if city_name not in _simulators:
        _simulators[city_name] = CitySimulator(city_name)
    return _simulators[city_name]
