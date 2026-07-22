import urllib.request
import json
import time
import subprocess
import sys

def test_api():
    print("Starting AeroVigil Backend Server for integration verification...")
    # Start the backend server as a subprocess
    proc = subprocess.Popen([sys.executable, "run.py"], cwd="backend", stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for server to boot up
    print("Waiting 8 seconds for Uvicorn reload process to bind port...")
    time.sleep(8)
    
    try:
        # 1. Test /api/cities
        print("\n[Test 1] Testing /api/cities ...")
        with urllib.request.urlopen("http://localhost:8000/api/cities") as response:
            data = json.loads(response.read().decode())
            print("Cities response:", [c["name"] for c in data["cities"]])
            assert len(data["cities"]) == 5, "Should return 5 configured cities"
            print("SUCCESS")

        # 2. Test /api/metrics/grid-data
        print("\n[Test 2] Testing /api/metrics/grid-data?city=Delhi ...")
        with urllib.request.urlopen("http://localhost:8000/api/metrics/grid-data?city=Delhi") as response:
            data = json.loads(response.read().decode())
            print("Grid Dimensions:", len(data["grid_aqi"]), "x", len(data["grid_aqi"][0]))
            print("Station count:", len(data["stations"]))
            print("Thermal anomalies count:", len(data["satellite_fires"]))
            assert len(data["grid_aqi"]) == 10, "Grid rows must be 10"
            assert len(data["grid_aqi"][0]) == 10, "Grid columns must be 10"
            print("SUCCESS")

        # 3. Test /api/metrics/attribution
        print("\n[Test 3] Testing /api/metrics/attribution?city=Delhi&row=5&col=5 ...")
        with urllib.request.urlopen("http://localhost:8000/api/metrics/attribution?city=Delhi&row=5&col=5") as response:
            data = json.loads(response.read().decode())
            print("Attributions:", data["attributions"])
            print("Confidence:", data["confidence"], "%")
            assert "Vehicular Exhaust" in data["attributions"], "Attributions must include traffic"
            print("SUCCESS")

        # 4. Test /api/metrics/forecast
        print("\n[Test 4] Testing /api/metrics/forecast?city=Delhi&hours=24 ...")
        with urllib.request.urlopen("http://localhost:8000/api/metrics/forecast?city=Delhi&hours=24") as response:
            data = json.loads(response.read().decode())
            print("Forecast metrics:", data["performance"])
            assert "model_rmse" in data["performance"], "Performance must include model_rmse"
            print("SUCCESS")

        # 5. Test /api/metrics/enforcement
        print("\n[Test 5] Testing /api/metrics/enforcement?city=Delhi ...")
        with urllib.request.urlopen("http://localhost:8000/api/metrics/enforcement?city=Delhi") as response:
            data = json.loads(response.read().decode())
            print("Recommendations counts:", len(data["recommendations"]))
            assert len(data["recommendations"]) <= 5, "Should return top 5 hotspots"
            print("SUCCESS")

        # 6. Test /api/metrics/agents
        print("\n[Test 6] Testing /api/metrics/agents?city=Delhi ...")
        with urllib.request.urlopen("http://localhost:8000/api/metrics/agents?city=Delhi") as response:
            data = json.loads(response.read().decode())
            print("Agent summary agents:", [a["agent"] for a in data["agents"]])
            assert "ForecastAgent" in [a["agent"] for a in data["agents"]], "Should include forecast agent"
            print("SUCCESS")

        # 7. Test /api/metrics/digital-twin
        print("\n[Test 7] Testing /api/metrics/digital-twin?city=Delhi&scenario=road_closure ...")
        with urllib.request.urlopen("http://localhost:8000/api/metrics/digital-twin?city=Delhi&scenario=road_closure") as response:
            data = json.loads(response.read().decode())
            print("Digital twin baseline avg:", data["baseline_average_aqi"])
            assert data["scenario"] == "road_closure", "Scenario should be road_closure"
            print("SUCCESS")

        # 8. Test /api/dispatch
        print("\n[Test 8] Testing /api/dispatch POST request ...")
        req_data = json.dumps({
            "recommendation_id": "rec_delhi_5_5",
            "inspector_name": "Test Inspector",
            "vehicle_plate": "DL-11-TEST"
        }).encode('utf-8')
        
        req = urllib.request.Request(
            "http://localhost:8000/api/dispatch", 
            data=req_data, 
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print("Dispatch Response:", data)
            assert data["status"] == "Success", "Dispatch status should be Success"
            print("SUCCESS")
            
        print("\n=== All Integration Tests Completed Successfully! ===")
            
    except Exception as e:
        print(f"FAILED: {e}")
    finally:
        # Clean up process
        proc.terminate()
        proc.wait()
        print("Backend server shutdown.")

if __name__ == "__main__":
    test_api()
