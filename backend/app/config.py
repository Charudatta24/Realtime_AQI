# Configuration settings for Urban Air Quality Intelligence Platform

GRID_ROWS = 10
GRID_COLS = 10
GRID_RESOLUTION_KM = 1.0

DEFAULT_EMISSION_CALENDAR = {
    "residential": [1.08, 1.05, 0.98, 0.92, 0.90, 0.92, 0.98, 1.02, 1.05, 1.08, 1.10, 1.12],
    "industrial": [1.00, 0.98, 0.96, 0.95, 0.96, 0.98, 1.01, 1.03, 1.02, 1.00, 1.00, 1.02],
    "agricultural": [1.15, 1.10, 0.95, 0.90, 0.85, 0.80, 0.80, 0.85, 0.95, 1.05, 1.10, 1.15]
}

CITIES = {
    "Delhi": {
        "lat_center": 28.6139,
        "lon_center": 77.2090,
        "bg_aqi": 180,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "दिल्ली में वायु गुणवत्ता 'गंभीर' श्रेणी में है। कृपया मास्क पहनें और बाहरी गतिविधियों से बचें।",
        "sources": ["Biomass Burning", "Industrial Stacks", "Road Dust", "Vehicular Exhaust"]
    },
    "Mumbai": {
        "lat_center": 19.0760,
        "lon_center": 72.8777,
        "bg_aqi": 90,
        "primary_language": "Marathi",
        "lang_code": "mr",
        "advisory_template": "मुंबईत हवेची गुणवत्ता खालावली आहे. विशेषतः लहान मुले आणि वृद्धांनी काळजी घ्यावी.",
        "sources": ["Marine Activity", "Vehicular Exhaust", "Refinery Stacks", "Construction Dust"]
    },
    "Bengaluru": {
        "lat_center": 12.9716,
        "lon_center": 77.5946,
        "bg_aqi": 75,
        "primary_language": "Kannada",
        "lang_code": "kn",
        "advisory_template": "ಬೆಂಗಳೂರಿನಲ್ಲಿ ವಾಯು ಮಾಲಿನ್ಯ ಹೆಚ್ಚಾಗಿದೆ. ಸಾಧ್ಯವಾದಷ್ಟು ಸಾರ್ವಜನिक ಸಾರಿಗೆ ಬಳಸಿ.",
        "sources": ["Vehicular Exhaust", "Construction Dust", "Road Dust", "Waste Burning"]
    },
    "Chennai": {
        "lat_center": 13.0827,
        "lon_center": 80.2707,
        "bg_aqi": 80,
        "primary_language": "Tamil",
        "lang_code": "ta",
        "advisory_template": "சென்னையில் காற்று தரம் குறைந்துள்ளது. முகக்கவசம் அணிய பரிந்துரைக்கப்படுகிறது.",
        "sources": ["Port Emissions", "Vehicular Exhaust", "Coastal Aerosols", "Industrial Stacks"]
    },
    "Kolkata": {
        "lat_center": 22.5726,
        "lon_center": 88.3639,
        "bg_aqi": 120,
        "primary_language": "Bengali",
        "lang_code": "bn",
        "advisory_template": "কলকাতায় বায়ুর গুণমান অস্বাস্থ্যকর পর্যায়ে রয়েছে। বয়স্কদের ঘরের বাইরে যাওয়া এড়ানো উচিত।",
        "sources": ["Coal Combustion", "Vehicular Exhaust", "Waste Burning", "Biomass Cooking"]
    },
    "Hyderabad": {
        "lat_center": 17.3850,
        "lon_center": 78.4867,
        "bg_aqi": 95,
        "primary_language": "Telugu",
        "lang_code": "te",
        "advisory_template": "హైదరాబాద్‌లో ఆకాశం గుణవత్త తగ్గిందని హెచ్చరిక.",
        "sources": ["Vehicular Exhaust", "Industrial Stacks", "Construction Dust", "Road Dust"]
    },
    "Pune": {
        "lat_center": 18.5204,
        "lon_center": 73.8567,
        "bg_aqi": 85,
        "primary_language": "Marathi",
        "lang_code": "mr",
        "advisory_template": "पुण्यात हवेचे प्रदूषण मध्यम स्तरावर आहे.",
        "sources": ["Vehicular Exhaust", "Construction Dust", "Industrial Stacks"]
    },
    "Ahmedabad": {
        "lat_center": 23.0225,
        "lon_center": 72.5714,
        "bg_aqi": 110,
        "primary_language": "Gujarati",
        "lang_code": "gu",
        "advisory_template": "અમદાવાદમાં હવાનું પ્રદૂષણ વધારે છે.",
        "sources": ["Vehicular Exhaust", "Textile Industries", "Construction Dust"]
    },
    "Jaipur": {
        "lat_center": 26.9124,
        "lon_center": 75.7873,
        "bg_aqi": 125,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "जयपुर में वायु प्रदूषण बढ़ा हुआ है।",
        "sources": ["Vehicular Exhaust", "Construction Dust", "Industrial Stacks"]
    },
    "Lucknow": {
        "lat_center": 26.8467,
        "lon_center": 80.9462,
        "bg_aqi": 140,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "लखनऊ में हवा की गुणवत्ता खराब है।",
        "sources": ["Vehicular Exhaust", "Biomass Burning", "Industrial Stacks"]
    },
    "Indore": {
        "lat_center": 22.7196,
        "lon_center": 75.8577,
        "bg_aqi": 100,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "इंदौर में वायु प्रदूषण मध्यम है।",
        "sources": ["Vehicular Exhaust", "Industrial Stacks", "Construction Dust"]
    },
    "Surat": {
        "lat_center": 21.1458,
        "lon_center": 72.8355,
        "bg_aqi": 95,
        "primary_language": "Gujarati",
        "lang_code": "gu",
        "advisory_template": "સુરતમાં હવા સંતોષજનક છે.",
        "sources": ["Vehicular Exhaust", "Textile Industries", "Port Emissions"]
    },
    "Nagpur": {
        "lat_center": 21.1458,
        "lon_center": 79.0882,
        "bg_aqi": 105,
        "primary_language": "Marathi",
        "lang_code": "mr",
        "advisory_template": "नागपूरात हवेचे गुणवत्ता खराब आहे.",
        "sources": ["Vehicular Exhaust", "Coal Based Industries", "Construction Dust"]
    },
    "Kochi": {
        "lat_center": 9.9312,
        "lon_center": 76.2673,
        "bg_aqi": 70,
        "primary_language": "Malayalam",
        "lang_code": "ml",
        "advisory_template": "കൊച്ചിയിലെ വായുവിന്റെ ഗുണനിലവാരം നല്ലതാണ്.",
        "sources": ["Port Emissions", "Vehicular Exhaust", "Marine Activity"]
    },
    "Visakhapatnam": {
        "lat_center": 17.6869,
        "lon_center": 83.2185,
        "bg_aqi": 88,
        "primary_language": "Telugu",
        "lang_code": "te",
        "advisory_template": "విశాఖపట్నంలో ఆకాశం ఐనమిక్.",
        "sources": ["Port Emissions", "Steel Industries", "Vehicular Exhaust"]
    },
    "Bhopal": {
        "lat_center": 23.1815,
        "lon_center": 77.4104,
        "bg_aqi": 115,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "भोपाल में वायु प्रदूषण मध्यम से अधिक है।",
        "sources": ["Vehicular Exhaust", "Industrial Stacks", "Biomass Burning"]
    },
    "Vadodara": {
        "lat_center": 22.3072,
        "lon_center": 73.1812,
        "bg_aqi": 92,
        "primary_language": "Gujarati",
        "lang_code": "gu",
        "advisory_template": "વડોદરામાં હવાનું પ્રદૂષણ સામાન્ય છે.",
        "sources": ["Vehicular Exhaust", "Petrochemical Industries", "Construction Dust"]
    },
    "Chandigarh": {
        "lat_center": 30.7333,
        "lon_center": 76.7794,
        "bg_aqi": 130,
        "primary_language": "Punjabi",
        "lang_code": "pa",
        "advisory_template": "ਚੰਡੀਗੜ੍ਹ ਵਿੱਚ ਹਵਾ ਦੀ ਗੁਣਵੱਤਾ ਖਰਾਬ ਹੈ।",
        "sources": ["Vehicular Exhaust", "Biomass Burning", "Construction Dust"]
    },
    "Nashik": {
        "lat_center": 19.9975,
        "lon_center": 73.7898,
        "bg_aqi": 98,
        "primary_language": "Marathi",
        "lang_code": "mr",
        "advisory_template": "नाशिकात हवेचे गुणवत्ता सामान्य आहे.",
        "sources": ["Vehicular Exhaust", "Wine Industry", "Agricultural Activity"]
    },
    "Patna": {
        "lat_center": 25.5941,
        "lon_center": 85.1376,
        "bg_aqi": 135,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "पटना में वायु प्रदूषण अधिक है।",
        "sources": ["Vehicular Exhaust", "Biomass Burning", "Industrial Stacks"]
    },
    "Ranchi": {
        "lat_center": 23.3441,
        "lon_center": 85.3096,
        "bg_aqi": 105,
        "primary_language": "Hindi",
        "lang_code": "hi",
        "advisory_template": "राँची में प्रदूषण मध्यम है।",
        "sources": ["Industrial Stacks", "Mining", "Vehicular Exhaust"]
    }
}
