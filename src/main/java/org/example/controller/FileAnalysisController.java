package org.example.controller;

import org.example.service.FileAnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;
import java.util.Map;

@Controller
public class FileAnalysisController {

    @Autowired
    private FileAnalysisService fileAnalysisService;

    @GetMapping("/")
    public String redirectToLogin() {
        return "redirect:/login";
    }

    @GetMapping("/upload")
    public String showUploadForm(Model model, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return "redirect:/login";
        }
        List<String> uploadedFiles = fileAnalysisService.getUploadedFiles();
        model.addAttribute("uploadedFiles", uploadedFiles);
        return "upload";
    }

    @PostMapping("/upload")
    public String handleFileUpload(@RequestParam("file") MultipartFile file,
                                 RedirectAttributes redirectAttributes,
                                 Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return "redirect:/login";
        }
        try {
            String fileName = fileAnalysisService.analyzeFile(file);
            redirectAttributes.addFlashAttribute("message", "File uploaded successfully!");
            return "redirect:/upload";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("message", "Error: " + e.getMessage());
            return "redirect:/upload";
        }
    }

    @GetMapping("/analysis")
    public String showAnalysis(@RequestParam("file") String fileName,
                             Model model,
                             Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return "redirect:/login";
        }
        try {
            Map<String, Object> analysis = fileAnalysisService.getAnalysis(fileName);
            model.addAttribute("analysis", analysis);
            model.addAttribute("fileName", fileName);
            return "analysis";
        } catch (Exception e) {
            model.addAttribute("error", e.getMessage());
            return "redirect:/upload";
        }
    }
} 