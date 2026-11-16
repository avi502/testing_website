#!/usr/bin/env python3
"""
scripts/generate_sample_data.py
Generates synthetic sensor data for the induction motor condition-monitoring system.

Simulates 5 parameters:
  1. Vibration (mm/s)
  2. Temperature (°C)
  3. Current (A)
  4. Voltage (V)
  5. Rotational speed (RPM)

Simulates 3 operational regimes:
  - Normal (healthy baseline)
  - Warning (mild thermal/mechanical stress)
  - Critical (high vibration, overheating, electrical overload)
"""

import argparse
import csv
import datetime
import math
import os
import random


def generate_motor_data(
    num_samples: int = 600,
    output_path: str = "data/motor_sensors.csv",
    seed: int = 42,
) -> str:
    """Generate synthetic induction motor sensor dataset and save to CSV."""
    random.seed(seed)

    # Ensure output directory exists
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    start_time = datetime.datetime.now() - datetime.timedelta(seconds=num_samples * 10)

    rows = []
    # Base operational baseline: 4-pole 50 Hz induction motor
    # Nominal: 400V, ~10A, ~1475 RPM, ~50°C, ~2.0 mm/s vibration

    for i in range(num_samples):
        timestamp = (start_time + datetime.timedelta(seconds=i * 10)).strftime("%Y-%m-%d %H:%M:%S")

        # Roll for operating state
        # 75% normal, 15% warning, 10% critical
        roll = random.random()

        # Slight continuous time drift to emulate realistic operation
        drift_factor = math.sin(i / 50.0) * 0.3

        if roll < 0.75:
            state = "Normal"
            vibration = max(0.3, random.gauss(2.1, 0.35) + drift_factor * 0.2)
            temperature = random.gauss(52.0, 2.5) + drift_factor * 1.5
            current = max(1.0, random.gauss(9.8, 0.6) + drift_factor * 0.3)
            voltage = random.gauss(400.0, 2.5)
            rotational_speed = max(800.0, random.gauss(1475.0, 6.0))
        elif roll < 0.90:
            state = "Warning"
            vibration = random.gauss(5.4, 0.6)
            temperature = random.gauss(78.5, 3.2)
            current = random.gauss(16.2, 1.1)
            voltage = random.gauss(388.0, 4.0)
            rotational_speed = random.gauss(1440.0, 10.0)
        else:
            state = "Critical"
            vibration = random.gauss(8.8, 0.9)
            temperature = random.gauss(96.0, 3.8)
            current = random.gauss(22.4, 1.4)
            voltage = random.gauss(368.0, 6.5)
            rotational_speed = random.gauss(1385.0, 16.0)

        rows.append({
            "timestamp": timestamp,
            "vibration": round(vibration, 2),
            "temperature": round(temperature, 2),
            "current": round(current, 2),
            "voltage": round(voltage, 2),
            "rotational_speed": round(rotational_speed, 1),
            "simulated_state": state,
        })

    # Write to CSV
    fieldnames = [
        "timestamp",
        "vibration",
        "temperature",
        "current",
        "voltage",
        "rotational_speed",
        "simulated_state",
    ]

    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return os.path.abspath(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic induction motor sensor dataset.")
    parser.add_argument(
        "--samples",
        type=int,
        default=600,
        help="Number of sensor readings to generate (default: 600)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/motor_sensors.csv",
        help="Destination CSV file path (default: data/motor_sensors.csv)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )

    args = parser.parse_args()
    saved_path = generate_motor_data(
        num_samples=args.samples,
        output_path=args.output,
        seed=args.seed,
    )
    print(f"Generated {args.samples} sensor readings successfully at: {saved_path}")
