package com.loantracking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LoanTrackingApplication {

    public static void main(String[] args) {
        SpringApplication.run(LoanTrackingApplication.class, args);
    }
}

