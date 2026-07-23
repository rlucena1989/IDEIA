const std = @import("std");
const testing = std.testing;
const Item = @import("Item.zig").Item;
const ItemList = @import("Item.zig").ItemList;

test "Item init and deinit" {
    var item = Item.init(testing.allocator, "test");
    defer item.deinit();
    try testing.expect(item.name.len > 0);
}

test "ItemList add and getAll" {
    var list = ItemList.init(testing.allocator);
    defer list.deinit();

    const item = Item.init(testing.allocator, "item1");
    try list.add(item);

    const items = list.getAll();
    try testing.expectEqual(@as(usize, 1), items.len);
}
