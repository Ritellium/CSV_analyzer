package org.example.service.analyzer;

import java.util.*;
import java.util.stream.Collectors;

public class TextAnalyzer implements DataAnalyzer {
    @Override
    public boolean canAnalyze(String value) {
        return value != null && !value.trim().isEmpty();
    }

    @Override
    public Map<String, Object> analyze(List<String> values) {
        List<String> nonNullValues = values.stream()
                .filter(this::canAnalyze)
                .collect(Collectors.toList());

        if (nonNullValues.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("count", nonNullValues.size());
        stats.put("nullCount", values.size() - nonNullValues.size());
        stats.put("uniqueCount", new HashSet<>(nonNullValues).size());
        stats.put("topValues", getTopFrequentValues(nonNullValues, 5));

        return stats;
    }

    private List<Map<String, Object>> getTopFrequentValues(List<String> values, int limit) {
        return values.stream()
                .collect(Collectors.groupingBy(
                        value -> value,
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit)
                .map(entry -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("value", entry.getKey());
                    result.put("count", entry.getValue());
                    return result;
                })
                .collect(Collectors.toList());
    }
} 