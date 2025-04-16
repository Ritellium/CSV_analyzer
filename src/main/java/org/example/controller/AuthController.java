package org.example.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class AuthController {

    @GetMapping("/login")
    public String showLoginPage() {
        return "login";
    }

    @GetMapping("/register")
    public String showRegisterPage() {
        return "register";
    }

    @PostMapping("/login")
    public String handleLogin() {
        // TODO: Implement actual login logic
        return "redirect:/upload";
    }

    @PostMapping("/register")
    public String handleRegistration() {
        // TODO: Implement actual registration logic
        return "redirect:/login";
    }
} 