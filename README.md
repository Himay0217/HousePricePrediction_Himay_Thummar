# Bengaluru Home Price Estimator

A machine learning web app that predicts residential property prices in Bengaluru based on location, area, BHK, and number of bathrooms.

## Project Structure

```
├── client/          # Frontend (HTML, CSS, JS)
├── model/           # Jupyter notebook, dataset, and trained model
└── server/          # Flask API + model artifacts
```

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Backend:** Python, Flask
- **ML Model:** Scikit-learn (Linear Regression), trained on the Bengaluru House Price dataset

## Getting Started

### Prerequisites

- Python 3.x
- pip

### Installation

1. Clone the repo and navigate to the project folder.

2. Install dependencies:
   ```bash
   pip install flask numpy scikit-learn
   ```

3. Update the artifact paths in `server/util.py` to point to your local `server/artifacts/` directory:
   ```python
   # Replace the hardcoded paths with relative ones, e.g.:
   with open("./artifacts/columns.json", "r") as f:
   with open("./artifacts/banglore_house_model.pickle", "rb") as f:
   ```

### Running the App

Start the Flask server from the `server/` directory:

```bash
cd server
python app.py
```

Then open your browser at `http://127.0.0.1:5000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Serves the frontend |
| GET | `/get_location_names` | Returns list of available neighbourhoods |
| POST | `/predict_home_price` | Returns estimated price |

### Predict Home Price

**POST** `/predict_home_price`

Form fields:

| Field | Type | Description |
|-------|------|-------------|
| `location` | string | Neighbourhood name |
| `total_sqft` | float | Total area in square feet |
| `bhk` | int | Number of bedrooms |
| `bath` | int | Number of bathrooms |

**Response:**
```json
{ "estimated_price": 85.5 }
```

Price is returned in lakhs (INR).

## Model

The ML model was built and trained in `model/HousePricePrediction.ipynb` using the `bengaluru_house_prices.csv` dataset. The trained model and feature columns are saved as:

- `server/artifacts/banglore_house_model.pickle`
- `server/artifacts/columns.json`
