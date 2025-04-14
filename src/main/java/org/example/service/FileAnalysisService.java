package org.example.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.example.service.analyzer.DataAnalyzer;
import org.example.service.analyzer.NumericAnalyzer;
import org.example.service.analyzer.TextAnalyzer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FileAnalysisService {
    private final List<DataAnalyzer> analyzers;

    public FileAnalysisService() {
        this.analyzers = Arrays.asList(
                new NumericAnalyzer(),
                new TextAnalyzer()
        );
    }

    public Map<String, Object> analyzeFile(MultipartFile file) throws IOException {
        if (!file.getOriginalFilename().endsWith(".csv")) {
            throw new IllegalArgumentException("Only CSV files are supported");
        }

        return analyzeCSV(file);
    }

    private Map<String, Object> analyzeCSV(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, String>> data = new ArrayList<>();
        
        try (CSVParser parser = new CSVParser(
                new InputStreamReader(file.getInputStream()),
                CSVFormat.DEFAULT.withFirstRecordAsHeader())) {
            
            List<String> headers = parser.getHeaderNames();
            result.put("headers", headers);
            
            // Collect all values for each column
            Map<String, List<String>> columnValues = new HashMap<>();
            headers.forEach(header -> columnValues.put(header, new ArrayList<>()));
            
            for (CSVRecord record : parser) {
                Map<String, String> row = new HashMap<>();
                for (String header : headers) {
                    String value = record.get(header);
                    row.put(header, value);
                    columnValues.get(header).add(value);
                }
                data.add(row);
            }

            // Analyze each column
            Map<String, Object> columnAnalysis = new HashMap<>();
            for (String header : headers) {
                List<String> values = columnValues.get(header);
                DataAnalyzer analyzer = determineAnalyzer(values);
                if (analyzer != null) {
                    columnAnalysis.put(header, analyzer.analyze(values));
                }
            }
            
            result.put("data", data);
            result.put("analysis", columnAnalysis);
        }
        
        return result;
    }

    private DataAnalyzer determineAnalyzer(List<String> values) {
        // Try each analyzer until one can handle the data
        for (DataAnalyzer analyzer : analyzers) {
            if (values.stream().anyMatch(analyzer::canAnalyze)) {
                return analyzer;
            }
        }
        return null;
    }
} 