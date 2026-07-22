import math
from copy import deepcopy
from datetime import datetime
import numpy as np
from app.simulator import get_simulator

SCENARIOS = ["road_closure", "construction_restriction", "combined"]


def _apply_road_closure(state: dict) -> None:
    """Apply traffic suppression to highway corridors and nearby cells."""
    grid_aqi = np.array(state["grid_aqi"], dtype=float)
    grid_pm25 = np.array(state["grid_pm25"], dtype=float)
    grid_no2 = np.array(state["grid_no2"], dtype=float)
    grid_co = np.array(state["grid_co"], dtype=float)

    for hwy in state["highways"]:
        r, c = hwy["row"], hwy["col"]
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                rr, cc = r + dr, c + dc
                if 0 <= rr < grid_aqi.shape[0] and 0 <= cc < grid_aqi.shape[1]:
                    distance = math.sqrt(dr * dr + dc * dc)
                    factor = 0.45 if distance == 0 else 0.25 if distance <= 1 else 0.12
                    reduction = grid_aqi[rr, cc] * factor * 0.18
                    grid_aqi[rr, cc] = max(20, grid_aqi[rr, cc] - reduction)
                    grid_pm25[rr, cc] = max(5, grid_pm25[rr, cc] * (1.0 - 0.14 * factor))
                    grid_no2[rr, cc] = max(2, grid_no2[rr, cc] * (1.0 - 0.40 * factor))
                    grid_co[rr, cc] = max(0.1, grid_co[rr, cc] * (1.0 - 0.40 * factor))

    state["grid_aqi"] = np.round(np.clip(grid_aqi, 20, 500)).astype(int).tolist()
    state["grid_pm25"] = np.round(np.clip(grid_pm25, 5, 500)).astype(int).tolist()
    state["grid_no2"] = np.round(np.clip(grid_no2, 2, 250)).astype(int).tolist()
    state["grid_co"] = np.round(np.clip(grid_co, 0.1, 10.0), 2).tolist()


def _apply_construction_restriction(state: dict) -> None:
    """Apply construction emission reductions to active sites and their surrounds."""
    grid_aqi = np.array(state["grid_aqi"], dtype=float)
    grid_pm25 = np.array(state["grid_pm25"], dtype=float)
    grid_pm10 = np.array(state["grid_pm10"], dtype=float)

    for con in state["construction_sites"]:
        r, c, strength = con["row"], con["col"], con["strength"]
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                rr, cc = r + dr, c + dc
                if 0 <= rr < grid_aqi.shape[0] and 0 <= cc < grid_aqi.shape[1]:
                    dist = math.sqrt(dr * dr + dc * dc)
                    if dist > 2.5:
                        continue
                    factor = max(0.1, 0.65 - 0.18 * dist)
                    reduction = grid_aqi[rr, cc] * factor * 0.12
                    grid_aqi[rr, cc] = max(20, grid_aqi[rr, cc] - reduction)
                    grid_pm25[rr, cc] = max(5, grid_pm25[rr, cc] * (1.0 - 0.12 * factor))
                    grid_pm10[rr, cc] = max(10, grid_pm10[rr, cc] * (1.0 - 0.20 * factor))

    state["grid_aqi"] = np.round(np.clip(grid_aqi, 20, 500)).astype(int).tolist()
    state["grid_pm25"] = np.round(np.clip(grid_pm25, 5, 500)).astype(int).tolist()
    state["grid_pm10"] = np.round(np.clip(grid_pm10, 10, 800)).astype(int).tolist()


def simulate_intervention_scenario(city_name: str, base_timestamp: datetime, scenario: str) -> dict:
    """Simulates intervention impact using a digital twin of the urban emissions system."""
    if scenario not in SCENARIOS:
        raise ValueError(f"Unsupported scenario: {scenario}")

    sim = get_simulator(city_name)
    baseline = sim.generate_grid_state(base_timestamp)
    scenario_state = deepcopy(baseline)

    # Apply the requested intervention scenario
    if scenario in ["road_closure", "combined"]:
        _apply_road_closure(scenario_state)
    if scenario in ["construction_restriction", "combined"]:
        _apply_construction_restriction(scenario_state)

    baseline_aqi = np.array(baseline["grid_aqi"], dtype=float)
    scenario_aqi = np.array(scenario_state["grid_aqi"], dtype=float)
    delta = baseline_aqi - scenario_aqi

    return {
        "city": city_name,
        "timestamp": base_timestamp.isoformat(),
        "scenario": scenario,
        "scenario_description": {
            "road_closure": "Simulated closure of heavily trafficked corridor segments to reduce vehicular emissions.",
            "construction_restriction": "Simulated construction dust mitigation and restriction of active permit zones.",
            "combined": "Simulated both traffic corridor closures and construction emission controls together."
        }[scenario],
        "baseline_average_aqi": round(float(np.mean(baseline_aqi)), 1),
        "scenario_average_aqi": round(float(np.mean(scenario_aqi)), 1),
        "average_aqi_reduction": round(float(np.mean(delta)), 1),
        "peak_reduction": round(float(np.max(delta)), 1),
        "grid_aqi_delta": np.round(delta).astype(int).tolist(),
        "scenario_state": {
            "grid_aqi": scenario_state["grid_aqi"],
            "grid_pm25": scenario_state["grid_pm25"],
            "grid_pm10": scenario_state["grid_pm10"],
            "grid_no2": scenario_state["grid_no2"],
            "grid_co": scenario_state["grid_co"],
            "grid_so2": scenario_state["grid_so2"],
            "grid_o3": scenario_state["grid_o3"]
        }
    }
