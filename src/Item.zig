const std = @import("std");

pub const Item = struct {
    id: u64,
    name: []const u8,

    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, name: []const u8) Item {
        return Item{
            .id = @intCast(u64, @bitCast(u64, std.time.nanoTimestamp())),
            .name = name,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Item) void {
        _ = self;
    }
};

pub const ItemList = struct {
    items: std.ArrayList(Item),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) ItemList {
        return ItemList{
            .items = std.ArrayList(Item).init(allocator),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *ItemList) void {
        self.items.deinit();
    }

    pub fn add(self: *ItemList, item: Item) !void {
        try self.items.append(item);
    }

    pub fn getAll(self: *ItemList) []Item {
        return self.items.items;
    }
};
