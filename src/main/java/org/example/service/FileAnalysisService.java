package org.example.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FileAnalysisService {
    private final Map<String, List<String[]>> fileData = new HashMap<>();
    private final Map<String, String[]> fileHeaders = new HashMap<>();

    public String analyzeFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (!file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
            throw new IllegalArgumentException("Only CSV files are supported");
        }

        String fileName = file.getOriginalFilename();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new IllegalArgumentException("File is empty");
            }

            String[] headers = headerLine.split(",");
            fileHeaders.put(fileName, headers);

            List<String[]> rows = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                rows.add(line.split(","));
            }
            fileData.put(fileName, rows);

            return fileName;
        }
    }

    public Map<String, Object> getAnalysis(String fileName) {
        Map<String, Object> analysis = new HashMap<>();
        
        if (!fileData.containsKey(fileName)) {
            throw new IllegalArgumentException("File not found");
        }

        List<String[]> rows = fileData.get(fileName);
        String[] headers = fileHeaders.get(fileName);

        // Basic analysis
        analysis.put("fileName", fileName);
        analysis.put("rowCount", rows.size());
        analysis.put("columnCount", headers.length);
        analysis.put("headers", headers);

        // Column analysis
        Map<String, Object> columnAnalysis = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            Map<String, Object> columnStats = new HashMap<>();
            List<String> values = new ArrayList<>();
            for (String[] row : rows) {
                if (i < row.length) {
                    values.add(row[i]);
                }
            }
            
            // Basic statistics
            columnStats.put("totalCount", values.size());
            columnStats.put("uniqueCount", new HashSet<>(values).size());
            
            // Try to determine if column is numeric
            boolean isNumeric = values.stream().allMatch(v -> v.matches("-?\\d+(\\.\\d+)?"));
            if (isNumeric) {
                List<Double> numericValues = values.stream()
                    .map(Double::parseDouble)
                    .collect(Collectors.toList());
                
                double sum = numericValues.stream().mapToDouble(Double::doubleValue).sum();
                double mean = sum / numericValues.size();
                
                columnStats.put("isNumeric", true);
                columnStats.put("mean", mean);
                columnStats.put("min", Collections.min(numericValues));
                columnStats.put("max", Collections.max(numericValues));
            } else {
                columnStats.put("isNumeric", false);
            }
            
            columnAnalysis.put(headers[i], columnStats);
        }
        
        analysis.put("columnAnalysis", columnAnalysis);
        return analysis;
    }

    public List<String> getUploadedFiles() {
        return new ArrayList<>(fileData.keySet());
    }
} 