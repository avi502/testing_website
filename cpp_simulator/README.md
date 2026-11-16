# C++ Motor Simulator (C++17)

This folder contains the software simulator written in C++17 that models an industrial 3-phase induction motor under different operational conditions.

## Requirements
- Any standard C++17 compiler:
  - GCC (`g++` >= 9.0)
  - Clang (`clang++` >= 10.0)
  - Microsoft Visual C++ (`cl.exe` MSVC 2019/2022)

## How to Compile

### Option A: Using GCC (MinGW / Linux / macOS)
```bash
g++ -std=c++17 -O2 simulator.cpp -o simulator
```

### Option B: Using Clang
```bash
clang++ -std=c++17 -O2 simulator.cpp -o simulator
```

### Option C: Using MSVC (Developer Command Prompt)
```cmd
cl /std:c++17 /O2 simulator.cpp
```

## How to Run
```bash
# Run with defaults (600 readings, saved to motor_sensors.csv)
./simulator

# Custom sample count and output path
./simulator --samples 1000 --output ../data/motor_sensors.csv
```

> **Note:** If you do not have a C++ compiler installed, you can simply use the Python script `python scripts/generate_sample_data.py`, which generates the exact same dataset without needing any C++ setup.
