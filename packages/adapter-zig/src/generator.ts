import * as fs from 'fs';
import * as path from 'path';

export interface GeneratedFile { path: string; content: string }

export function generateModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  return [
    {
      path: path.join(destDir, `${moduleName}.zig`),
      content: `const std = @import("std");

pub const ${cap} = struct {
    id: u64,
    name: []const u8,

    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, name: []const u8) ${cap} {
        return ${cap}{
            .id = @intCast(u64, @bitCast(u64, std.time.nanoTimestamp())),
            .name = name,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *${cap}) void {
        _ = self;
    }
};

pub const ${cap}List = struct {
    items: std.ArrayList(${cap}),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) ${cap}List {
        return ${cap}List{
            .items = std.ArrayList(${cap}).init(allocator),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *${cap}List) void {
        self.items.deinit();
    }

    pub fn add(self: *${cap}List, item: ${cap}) !void {
        try self.items.append(item);
    }

    pub fn getAll(self: *${cap}List) []${cap} {
        return self.items.items;
    }
};
`,
    },
    {
      path: path.join(destDir, `${moduleName}_test.zig`),
      content: `const std = @import("std");
const testing = std.testing;
const ${cap} = @import("${moduleName}.zig").${cap};
const ${cap}List = @import("${moduleName}.zig").${cap}List;

test "${cap} init and deinit" {
    var item = ${cap}.init(testing.allocator, "test");
    defer item.deinit();
    try testing.expect(item.name.len > 0);
}

test "${cap}List add and getAll" {
    var list = ${cap}List.init(testing.allocator);
    defer list.deinit();

    const item = ${cap}.init(testing.allocator, "item1");
    try list.add(item);

    const items = list.getAll();
    try testing.expectEqual(@as(usize, 1), items.len);
}
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  return [
    {
      path: path.join(projectName, 'build.zig'),
      content: `const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "${projectName}",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    const unit_tests = b.addTest(.{
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    const run_test = b.addRunArtifact(unit_tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_test.step);
}
`,
    },
    {
      path: path.join(projectName, 'src', 'main.zig'),
      content: `const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("Hello from ${projectName}\n", .{});
}

test "basic" {
    try std.testing.expect(true);
}
`,
    },
    {
      path: path.join(projectName, 'src', 'root.zig'),
      content: `const std = @import("std");

pub const std_options: std.Options = .{
    .log_level = .info,
};
`,
    },
  ];
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const f of files) {
    const dir = path.dirname(f.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f.path, f.content, 'utf-8');
  }
}
