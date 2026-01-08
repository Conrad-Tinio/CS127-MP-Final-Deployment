package com.loantracking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupDTO {
    private UUID groupId;
    private String groupName;
    private List<PersonDTO> members;
}






