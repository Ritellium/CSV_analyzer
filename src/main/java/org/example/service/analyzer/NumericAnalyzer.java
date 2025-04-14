package org.example.service.analyzer;

import java.util.*;
import java.util.stream.Collectors;

public class NumericAnalyzer implements DataAnalyzer {
    @Override
    public boolean canAnalyze(String value) {
        if (value == null || value.trim().isEmpty()) {
            return false;
        }
        try {
            Double.parseDouble(value);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    @Override
    public Map<String, Object> analyze(List<String> values) {
        List<Double> numericValues = values.stream()
                .filter(this::canAnalyze)
                .map(Double::parseDouble)
                .collect(Collectors.toList());

        if (numericValues.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("mean", calculateMean(numericValues));
        stats.put("median", calculateMedian(numericValues));
        stats.put("stdDev", calculateStandardDeviation(numericValues));
        stats.put("min", Collections.min(numericValues));
        stats.put("max", Collections.max(numericValues));
        stats.put("count", numericValues.size());
        stats.put("nullCount", values.size() - numericValues.size());

        return stats;
    }

    private double calculateMean(List<Double> values) {
        return values.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private double calculateMedian(List<Double> values) {
        List<Double> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int size = sorted.size();
        if (size % 2 == 0) {
            return (sorted.get(size/2 - 1) + sorted.get(size/2)) / 2.0;
        } else {
            return sorted.get(size/2);
        }
    }

    private double calculateStandardDeviation(List<Double> values) {
        double mean = calculateMean(values);
        double sumSquaredDiff = values.stream()
                .mapToDouble(x -> Math.pow(x - mean, 2))
                .sum();
        return Math.sqrt(sumSquaredDiff / values.size());
    }
} 