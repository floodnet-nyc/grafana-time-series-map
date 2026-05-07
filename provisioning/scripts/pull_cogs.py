import json
import os
import requests
from datetime import datetime, timezone, timedelta

OUT_BASE_URL = "http://localhost:3000/public/sample-data"
OUT_DIR = os.path.abspath(os.path.join(__file__, '..', '..', 'sample-data'))

def format_utc(time: datetime):
    return time.strftime("%Y%m%dT%H%M%SZ")

def main(base_url, out_dir=OUT_DIR, start=None, end=None, date_format="%Y%m%dT%H%M%SZ"):
    # Match the event data time range: 2025-10-30T17:24 to 2025-10-31T07:26
    start = datetime(2025, 10, 30, 0, 0, 0, tzinfo=timezone.utc)
    end   = datetime(2025, 10, 31, 20, 0, 0, tzinfo=timezone.utc)

    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(f"{out_dir}/cogs", exist_ok=True)

    features = []
    t = start
    while t <= end:
        url_i = f"{base_url}/MRMS_MRMS_PrecipRate_00.00_{t.strftime(date_format)}.tif"
        out_path = f"{out_dir}/cogs/{t.strftime(date_format)}.tif"
        out_url = f"{OUT_BASE_URL}/cogs/{t.strftime(date_format)}.tif"

        if not os.path.exists(out_path):
            r = requests.get(url_i)
            if r.status_code != 200:
                print(f"Warning: {t} returned status code {r.status_code}")
                print(url_i)
                t += timedelta(minutes=1)
                continue
            with open(f"{out_dir}/cogs/{t.strftime(date_format)}.tif", "wb") as f:
                f.write(r.content)
            print(f"Downloaded {t}")

        features.append({"properties": {"time": t.isoformat(), "url": out_url}})
        t += timedelta(minutes=2)

    out = {"type": "FeatureCollection", "features": features}
    with open(f'{out_dir}/precip_cog_index.json', "w") as f:
        json.dump(out, f, indent=2)

    print(f"Generated {len(features)} entries, {features[0]['properties']['time']} - {features[-1]['properties']['time']}")

if __name__ == '__main__':
    import fire
    fire.Fire(main)