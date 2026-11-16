/**
 * @file simulator.cpp
 * @brief Software-based induction motor sensor data generator in C++17.
 * 
 * Generates synthetic sensor readings across five parameters:
 *  - vibration (mm/s)
 *  - temperature (°C)
 *  - current (A)
 *  - voltage (V)
 *  - rotational_speed (RPM)
 * 
 * Simulates three operating regimes: Normal, Warning, and Critical.
 */

#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <random>
#include <iomanip>
#include <chrono>
#include <ctime>
#include <sstream>

struct MotorReading {
    std::string timestamp;
    double vibration;
    double temperature;
    double current;
    double voltage;
    double rotational_speed;
    std::string simulated_state;
};

// Generates an ISO-8601 formatted timestamp shifted by seconds
std::string formatTimestamp(const std::chrono::system_clock::time_point& baseTime, int offsetSeconds) {
    auto t = baseTime + std::chrono::seconds(offsetSeconds);
    std::time_t timeT = std::chrono::system_clock::to_time_t(t);
    std::tm tmStruct{};
#if defined(_WIN32) || defined(_WIN64)
    localtime_s(&tmStruct, &timeT);
#else
    localtime_r(&timeT, &tmStruct);
#endif
    std::ostringstream oss;
    oss << std::put_time(&tmStruct, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

int main(int argc, char* argv[]) {
    int totalSamples = 600;
    std::string outputFile = "motor_sensors.csv";

    // Simple command-line arguments parsing
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--samples" && i + 1 < argc) {
            totalSamples = std::stoi(argv[++i]);
        } else if (arg == "--output" && i + 1 < argc) {
            outputFile = argv[++i];
        } else if (arg == "--help" || arg == "-h") {
            std::cout << "Usage: simulator [--samples N] [--output filename.csv]\n";
            std::cout << "Default: 600 samples -> motor_sensors.csv\n";
            return 0;
        }
    }

    std::cout << "========================================================\n";
    std::cout << "   Induction Motor Condition-Monitoring Simulator (C++17)\n";
    std::cout << "========================================================\n";
    std::cout << "Generating " << totalSamples << " sensor readings...\n";
    std::cout << "Output file: " << outputFile << "\n";

    std::random_device rd;
    std::mt19937 gen(42); // Seeded for reproducibility

    // Gaussian distributions for 3 operational states
    // 1. Normal state (Healthy operation)
    std::normal_distribution<double> normVib(2.1, 0.35);
    std::normal_distribution<double> normTemp(52.0, 2.5);
    std::normal_distribution<double> normCurr(9.8, 0.6);
    std::normal_distribution<double> normVolt(400.0, 2.8);
    std::normal_distribution<double> normRpm(1475.0, 7.0);

    // 2. Warning state (Developing fault / bearing wear / minor overheating)
    std::normal_distribution<double> warnVib(5.4, 0.6);
    std::normal_distribution<double> warnTemp(78.5, 3.2);
    std::normal_distribution<double> warnCurr(16.2, 1.1);
    std::normal_distribution<double> warnVolt(388.0, 4.5);
    std::normal_distribution<double> warnRpm(1440.0, 12.0);

    // 3. Critical state (Imminent failure / severe overload / high vibration)
    std::normal_distribution<double> critVib(8.7, 0.9);
    std::normal_distribution<double> critTemp(96.0, 3.8);
    std::normal_distribution<double> critCurr(22.4, 1.4);
    std::normal_distribution<double> critVolt(368.0, 6.0);
    std::normal_distribution<double> critRpm(1385.0, 18.0);

    // Random roll to decide state (e.g. 75% normal, 15% warning, 10% critical)
    std::uniform_real_distribution<double> roll(0.0, 1.0);

    std::vector<MotorReading> dataset;
    dataset.reserve(totalSamples);

    auto startTime = std::chrono::system_clock::now() - std::chrono::seconds(totalSamples * 10);

    for (int i = 0; i < totalSamples; ++i) {
        double r = roll(gen);
        MotorReading reading;
        reading.timestamp = formatTimestamp(startTime, i * 10);

        if (r < 0.75) {
            reading.simulated_state = "Normal";
            reading.vibration = std::max(0.2, normVib(gen));
            reading.temperature = normTemp(gen);
            reading.current = std::max(1.0, normCurr(gen));
            reading.voltage = normVolt(gen);
            reading.rotational_speed = std::max(500.0, normRpm(gen));
        } else if (r < 0.90) {
            reading.simulated_state = "Warning";
            reading.vibration = warnVib(gen);
            reading.temperature = warnTemp(gen);
            reading.current = warnCurr(gen);
            reading.voltage = warnVolt(gen);
            reading.rotational_speed = warnRpm(gen);
        } else {
            reading.simulated_state = "Critical";
            reading.vibration = critVib(gen);
            reading.temperature = critTemp(gen);
            reading.current = critCurr(gen);
            reading.voltage = critVolt(gen);
            reading.rotational_speed = critRpm(gen);
        }

        dataset.push_back(reading);
    }

    // Write to CSV file
    std::ofstream out(outputFile);
    if (!out.is_open()) {
        std::cerr << "Error: Could not open output file " << outputFile << " for writing.\n";
        return 1;
    }

    out << "timestamp,vibration,temperature,current,voltage,rotational_speed,simulated_state\n";
    for (const auto& r : dataset) {
        out << r.timestamp << ","
            << std::fixed << std::setprecision(2) << r.vibration << ","
            << std::fixed << std::setprecision(2) << r.temperature << ","
            << std::fixed << std::setprecision(2) << r.current << ","
            << std::fixed << std::setprecision(2) << r.voltage << ","
            << std::fixed << std::setprecision(1) << r.rotational_speed << ","
            << r.simulated_state << "\n";
    }
    out.close();

    std::cout << "Successfully generated " << dataset.size() << " records in '" << outputFile << "'.\n";
    std::cout << "Done.\n";

    return 0;
}
