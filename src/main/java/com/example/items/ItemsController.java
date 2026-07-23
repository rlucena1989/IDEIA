package com.example.items;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/itemss")
public class ItemsController {

    private final List<Items> items = new ArrayList<>();
    private long counter = 0;

    @PostMapping
    public Items create(@RequestBody Items item) {
        counter++;
        Items entity = new Items(counter, item.name());
        items.add(entity);
        return entity;
    }

    @GetMapping
    public List<Items> list() {
        return items;
    }

    @GetMapping("/{id}")
    public Items get(@PathVariable long id) {
        return items.stream()
            .filter(i -> i.id() == id)
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Not found"));
    }
}
