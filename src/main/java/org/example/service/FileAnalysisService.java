package org.example.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
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

        // Column analysis - use LinkedHashMap to maintain insertion order
        Map<String, Object> columnAnalysis = new LinkedHashMap<>();
        for (int i = 0; i < headers.length; i++) {
            Map<String, Object> columnStats = new HashMap<>();
            List<String> values = new ArrayList<>();
            for (String[] row : rows) {
                if (i < row.length) {
                    // Convert NA strings to null
                    String value = row[i];
                    if (value != null && value.trim().equalsIgnoreCase("NA")) {
                        value = null;
                    }
                    values.add(value);
                }
            }
            
            // Determine data type
            String dataType = determineDataType(values);
            columnStats.put("dataType", dataType);
            columnStats.put("totalCount", values.size());
            columnStats.put("nullCount", values.stream().filter(v -> v == null || (v != null && v.trim().equalsIgnoreCase("NA"))).count());
            columnStats.put("uniqueCount", values.stream().filter(v -> v != null && !v.trim().equalsIgnoreCase("NA")).distinct().count());
            
            // Calculate statistics based on data type
            if ("NUMERIC".equals(dataType) || "FLOAT".equals(dataType)) {
                List<Double> numericValues = values.stream()
                    .filter(v -> v != null && !v.trim().equalsIgnoreCase("NA"))
                    .map(Double::parseDouble)
                    .sorted()
                    .collect(Collectors.toList());
                
                if (!numericValues.isEmpty()) {
                    double sum = numericValues.stream().mapToDouble(Double::doubleValue).sum();
                    double mean = sum / numericValues.size();
                    
                    double variance = numericValues.stream()
                        .mapToDouble(x -> Math.pow(x - mean, 2))
                        .sum() / numericValues.size();
                    double stdDev = Math.sqrt(variance);
                    
                    // Calculate median and quartiles
                    int size = numericValues.size();
                    double median = size % 2 == 0 ?
                        (numericValues.get(size/2 - 1) + numericValues.get(size/2)) / 2.0 :
                        numericValues.get(size/2);
                    
                    double q1 = size % 4 == 0 ?
                        (numericValues.get(size/4 - 1) + numericValues.get(size/4)) / 2.0 :
                        numericValues.get(size/4);
                    
                    double q3 = size % 4 == 0 ?
                        (numericValues.get(3*size/4 - 1) + numericValues.get(3*size/4)) / 2.0 :
                        numericValues.get(3*size/4);
                    
                    columnStats.put("mean", mean);
                    columnStats.put("median", median);
                    columnStats.put("stdDev", stdDev);
                    columnStats.put("q1", q1);
                    columnStats.put("q3", q3);
                    columnStats.put("min", numericValues.get(0));
                    columnStats.put("max", numericValues.get(size - 1));
                }
            } else if ("TEXT".equals(dataType)) {
                // Calculate frequency for text columns
                Map<String, Long> frequency = values.stream()
                    .filter(v -> v != null && !v.trim().equalsIgnoreCase("NA"))
                    .collect(Collectors.groupingBy(v -> v, Collectors.counting()));
                
                List<Map.Entry<String, Long>> topValues = frequency.entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(5)
                    .collect(Collectors.toList());
                
                columnStats.put("topValues", topValues);
            }
            
            columnAnalysis.put(headers[i], columnStats);
        }
        
        analysis.put("columnAnalysis", columnAnalysis);
        analysis.put("previewData", rows.stream().limit(50).collect(Collectors.toList()));
        return analysis;
    }

    private String determineDataType(List<String> values) {
        if (values.isEmpty()) {
            return "TEXT";
        }

        boolean isInteger = true;
        boolean isFloat = true;
        int numericCount = 0;
        int totalCount = 0;

        for (String value : values) {
            // Treat NA strings as null
            if (value == null || value.trim().equalsIgnoreCase("NA")) {
                continue;
            }
            totalCount++;
            
            try {
                // Try parsing as integer first
                Integer.parseInt(value);
                numericCount++;
            } catch (NumberFormatException e) {
                isInteger = false;
                try {
                    // Try parsing as float
                    Double.parseDouble(value);
                    numericCount++;
                } catch (NumberFormatException ex) {
                    isFloat = false;
                }
            }

            if (!isInteger && !isFloat) {
                return "TEXT";
            }
        }

        // If more than 80% of non-null values are numeric, consider it numeric
        if (totalCount > 0 && (numericCount * 100.0 / totalCount) >= 80.0) {
            if (isInteger) {
                return "NUMERIC";
            } else {
                return "FLOAT";
            }
        }

        return "TEXT";
    }

    public List<String> getUploadedFiles() {
        return new ArrayList<>(fileData.keySet());
    }
} 