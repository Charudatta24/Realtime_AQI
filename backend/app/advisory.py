import numpy as np
from app.config import CITIES

def generate_health_advisory(city_name: str, aqi: int, row: int, col: int):
    """
    Generates health advisories, mappings of vulnerable institutions in the cell,
    and returns translated alerts based on the city's primary regional language.
    """
    config = CITIES[city_name]
    lang = config["primary_language"]
    lang_code = config["lang_code"]
    
    # 1. Determine severity category
    if aqi <= 50:
        cat = "Good"
        cat_color = "green"
        risk = "Minimal impact. Safe for all outdoor activities."
        advice_en = "Air quality is excellent. Great day for outdoor workouts and outdoor relaxation."
    elif aqi <= 100:
        cat = "Satisfactory"
        cat_color = "lime"
        risk = "Minor breathing discomfort for highly sensitive individuals."
        advice_en = "Air quality is acceptable. Sensitive individuals should consider reducing intense outdoor exertion."
    elif aqi <= 200:
        cat = "Moderate"
        cat_color = "yellow"
        risk = "Breathing discomfort to people with lungs, asthma and heart diseases."
        advice_en = "Children, elderly, and those with respiratory issues should limit prolonged outdoor exposure."
    elif aqi <= 300:
        cat = "Poor"
        cat_color = "orange"
        risk = "Breathing discomfort to most people on prolonged exposure."
        advice_en = "Everyone should reduce outdoor activities. Wear masks if going outside, close windows to keep dust out."
    elif aqi <= 400:
        cat = "Very Poor"
        cat_color = "red"
        risk = "Respiratory illness on prolonged exposure. Severe effect on heart/lung patients."
        advice_en = "Avoid all outdoor activities. Wear N95 masks. Use air purifiers indoors and keep physical exertion low."
    else:
        cat = "Severe"
        cat_color = "purple"
        risk = "Healthy people may experience respiratory effects. Serious impacts on those with existing diseases."
        advice_en = "CRITICAL: Stay indoors. Suspend all outdoor physical work. Keep doors closed. Ensure vulnerable groups are monitored."

    # 2. Add localized regional warning templates (simulating translation model outputs)
    regional_advisories = {
        "hi": {  # Hindi
            "category": "उत्कृष्ट" if aqi <= 50 else "संतोषजनक" if aqi <= 100 else "मध्यम" if aqi <= 200 else "खराब" if aqi <= 300 else "बहुत खराब" if aqi <= 400 else "गंभीर",
            "alert": f"वायु गुणवत्ता सूचकांक (AQI) वर्तमान में {aqi} है, जो कि '{cat}' श्रेणी में आता है। " + 
                     ("आउटडोर गतिविधियों से बचें और मास्क पहनें।" if aqi > 150 else "हवा सामान्य रूप से सांस लेने योग्य है।")
        },
        "kn": {  # Kannada
            "category": "ಉತ್ತಮ" if aqi <= 50 else "ತೃಪ್ತಿಕರ" if aqi <= 100 else "ಸಾಧಾರಣ" if aqi <= 200 else "ಕಳಪೆ" if aqi <= 300 else "ಬಹಳ ಕಳಪೆ" if aqi <= 400 else "ಗಂಭೀರ",
            "alert": f"ಪ್ರಸ್ತುತ ವಾಯು ಗುಣಮಟ್ಟ ಸೂಚ್ಯಂಕ (AQI) {aqi} ಆಗಿದೆ, ಇದು '{cat}' ವರ್ಗಕ್ಕೆ ಸೇರಿದೆ. " +
                     ("ದಯವಿಟ್ಟು ಹೊರಗೆ ಹೋಗುವಾಗ ಮಾಸ್ಕ್ ಧರಿಸಿ ಮತ್ತು ಜಾಗರೂಕರಾಗಿರಿ." if aqi > 150 else "ಗಾಳಿಯು ಸುರಕ್ಷಿತವಾಗಿದೆ.")
        },
        "ta": {  # Tamil
            "category": "நன்று" if aqi <= 50 else "திருப்திகரம்" if aqi <= 100 else "மிதமானது" if aqi <= 200 else "மோசமானது" if aqi <= 300 else "மிகவும் மோசமானது" if aqi <= 400 else "கடுமையானது",
            "alert": f"தற்போதைய காற்றின் தரக் குறியீடு (AQI) {aqi} ஆக உள்ளது, இது '{cat}' பிரிவைச் சேர்ந்தது. " +
                     ("முகக்கவசம் அணியவும், தேவையற்ற பயணங்களைத் தவிர்க்கவும்." if aqi > 150 else "சுவாசிக்க காற்று பாதுகாப்பானது.")
        },
        "mr": {  # Marathi
            "category": "चांगले" if aqi <= 50 else "समाधानकारक" if aqi <= 100 else "मध्यम" if aqi <= 200 else "वाईट" if aqi <= 300 else "अतिशय वाईट" if aqi <= 400 else "गंभीर",
            "alert": f"सध्या हवेची गुणवत्ता (AQI) {aqi} आहे, जी '{cat}' श्रेणीत मोडते. " +
                     ("बाहेर जाणे टाळा आणि तोंडाला मास्क लावा." if aqi > 150 else "हवा श्वसनासाठी सुरक्षित आहे.")
        },
        "bn": {  # Bengali
            "category": "ভালো" if aqi <= 50 else "সন্তোষজনক" if aqi <= 100 else "মোটামুটি" if aqi <= 200 else "খারাপ" if aqi <= 300 else "খুব খারাপ" if aqi <= 400 else "অত্যন্ত উদ্বেগজনক",
            "alert": f"বর্তমানে বায়ুর মান সূচক (AQI) হলো {aqi}, যা '{cat}' বিভাগের অন্তর্গত। " +
                     ("দয়া করে বাইরে বেরোনোর সময় মাস্ক ব্যবহার করুন।" if aqi > 150 else "বায়ুর মান সন্তোষজনক।")
        }
    }
    
    localized = regional_advisories.get(lang_code, {
        "category": cat,
        "alert": f"Air quality AQI is {aqi} ('{cat}'). Take necessary health precautions."
    })
    
    # 3. Simulate vulnerable infrastructures matching the cell
    vulnerabilities = []
    # Seed by coordinates to make it consistent per cell
    cell_hash = (row * 7 + col * 13) % 4
    if cell_hash == 0:
        vulnerabilities.append({"type": "School", "name": f"St. Xavier Primary (Grid {row},{col})", "count": 240})
    elif cell_hash == 1:
        vulnerabilities.append({"type": "Hospital", "name": f"Government Health Clinic ({row},{col})", "count": 80})
    elif cell_hash == 2:
        vulnerabilities.append({"type": "School", "name": f"Municipal Public School ({row},{col})", "count": 410})
        vulnerabilities.append({"type": "Old-Age Home", "name": f"Shanti Care Home ({row},{col})", "count": 45})
        
    return {
        "aqi": aqi,
        "category": cat,
        "category_color": cat_color,
        "risk_summary": risk,
        "advice_en": advice_en,
        "primary_language": lang,
        "lang_code": lang_code,
        "translated_alert": localized["alert"],
        "translated_category": localized["category"],
        "vulnerable_locations": vulnerabilities,
        "target_demographics": {
            "children": "Restrict outdoor playgrounds." if aqi > 100 else "No restrictions.",
            "elderly": "Strictly stay indoors with air purification." if aqi > 150 else "Safe for light walks.",
            "outdoor_workers": "Enforce mandatory N95 mask-wearing and regular hydration shifts." if aqi > 150 else "Standard work shifts."
        }
    }
