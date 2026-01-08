package com.loantracking.controller;

import com.loantracking.dto.GroupDTO;
import com.loantracking.service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "http://localhost:5173")
public class GroupController {
    
    @Autowired
    private GroupService groupService;
    
    @GetMapping
    public ResponseEntity<List<GroupDTO>> getAllGroups() {
        return ResponseEntity.ok(groupService.getAllGroups());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<GroupDTO> getGroupById(@PathVariable UUID id) {
        return ResponseEntity.ok(groupService.getGroupById(id));
    }
    
    @PostMapping
    public ResponseEntity<GroupDTO> createGroup(@RequestBody GroupDTO groupDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(groupDTO));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<GroupDTO> updateGroup(@PathVariable UUID id, @RequestBody GroupDTO groupDTO) {
        return ResponseEntity.ok(groupService.updateGroup(id, groupDTO));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable UUID id) {
        groupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{groupId}/members/{personId}")
    public ResponseEntity<Void> addMember(@PathVariable UUID groupId, @PathVariable UUID personId) {
        groupService.addMemberToGroup(groupId, personId);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{groupId}/members/{personId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID groupId, @PathVariable UUID personId) {
        groupService.removeMemberFromGroup(groupId, personId);
        return ResponseEntity.noContent().build();
    }
}






