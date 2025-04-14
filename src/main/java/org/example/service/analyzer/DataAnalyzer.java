package org.example.service.analyzer;

import java.util.List;
import java.util.Map;

public interface DataAnalyzer {
    boolean canAnalyze(String value);
    Map<String, Object> analyze(List<String> values);
} 