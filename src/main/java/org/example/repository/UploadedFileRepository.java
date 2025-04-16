package org.example.repository;

import org.example.model.UploadedFile;
import org.example.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UploadedFileRepository extends JpaRepository<UploadedFile, Long> {
    List<UploadedFile> findByUser(User user);
    List<UploadedFile> findByUserOrderByUploadDateDesc(User user);
    Optional<UploadedFile> findByFileNameAndUser(String fileName, User user);
} 