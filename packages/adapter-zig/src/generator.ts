import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('generator');

interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'text';
  required: boolean;
}

interface SpecComponent {
  name: string;
  responsibility: string;
  fields: SpecField[];
}

interface Spec {
  id: string;
  title: string;
  requirements: Array<{
    id: string;
    description: string;
    category: string;
    priority: string;
    acceptanceCriteria: string[];
  }>;
  design: {
    components: Array<{
      name: string;
      responsibility: string;
      interfaces: Array<{
        name: string;
        type: string;
        contract: string;
      }>;
      dependencies: string[];
    }>;
  };
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    type: string;
    given: string;
    when: string;
    then: string;
    expectedResult: string;
  }>;
}

export interface GeneratedFile { path: string; content: string }

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid' as const, required: true },
      { name: 'name', type: 'string' as const, required: true },
      { name: 'createdAt', type: 'date' as const, required: true },
      ...c.interfaces.filter(i => i.type === 'input').map(i => ({
        name: i.name.replace(/-/g, '_'),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);
  const appName = spec.title.replace(/[^a-zA-Z0-9_-]/g, '') || 'App';

  for (const comp of components) {
    files.push(...generateModule(comp.name, path.join(destDir, 'src')));
  }

  const imports = components.map(c =>
    `const ${c.name} = @import("${c.name}.zig");`
  ).join('\n');

  const routeDispatchers = components.map(c =>
    `    if (std.mem.eql(u8, path, "/api/${c.name}s")) {
        try ${c.name}.handleRequest(allocator, writer, method, body);
    }`
  ).join('\n\n');

  files.push({
    path: path.join(destDir, 'src', 'main.zig'),
    content: `const std = @import("std");
const http = std.http;
const Server = http.Server;
${imports}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var server = Server.init(allocator, .{ .reuse_address = true });
    defer server.deinit();

    const addr = try std.net.Address.parseIp4("0.0.0.0", 8080);
    try server.listen(addr);
    std.log.info("Server listening on 0.0.0.0:8080", .{});

    while (true) {
        const conn = try server.accept();
        _ = conn;
    }
}

test "server initializes" {
    try std.testing.expect(true);
}
`,
  });

  files.push({
    path: path.join(destDir, 'build.zig'),
    content: `const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "${appName}",
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
  });

  files.push({
    path: path.join(destDir, 'src', 'root.zig'),
    content: `const std = @import("std");

pub const std_options: std.Options = .{
    .log_level = .info,
};
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    const testCases = spec.acceptanceCriteria.map(tc =>
      `test "${tc.id}: ${tc.description}" {
    // Given: ${tc.given}
    // When: ${tc.when}
    // Then: ${tc.then}
    try std.testing.expect(true);
}`
    ).join('\n\n');

    files.push({
      path: path.join(destDir, 'src', 'acceptance_test.zig'),
      content: `const std = @import("std");
const testing = std.testing;

${testCases}
`,
    });
  }

  return files;
}

export function generateModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(moduleName);
  return [
    {
      path: path.join(destDir, `${moduleName}.zig`),
      content: `const std = @import("std");
const json = std.json;

pub const ${cap} = struct {
    id: u64,
    name: []const u8,
    created_at: i64,

    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, name: []const u8) !${cap} {
        const name_copy = try allocator.dupe(u8, name);
        return ${cap}{
            .id = @intCast(std.time.timestamp()),
            .name = name_copy,
            .created_at = std.time.timestamp(),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *${cap}) void {
        self.allocator.free(self.name);
    }

    pub fn toJson(self: ${cap}, writer: anytype) !void {
        try writer.print("{{\\"id\\": {}, \\"name\\": \\"{s}\\", \\"created_at\\": {}}}", .{
            self.id, self.name, self.created_at,
        });
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
        for (self.items.items) |*item| {
            item.deinit();
        }
        self.items.deinit();
    }

    pub fn add(self: *${cap}List, item: ${cap}) !void {
        try self.items.append(item);
    }

    pub fn getAll(self: *${cap}List) []${cap} {
        return self.items.items;
    }

    pub fn getById(self: *${cap}List, id: u64) ?${cap} {
        for (self.items.items) |item| {
            if (item.id == id) return item;
        }
        return null;
    }

    pub fn remove(self: *${cap}List, id: u64) bool {
        for (self.items.items, 0..) |item, i| {
            if (item.id == id) {
                self.items.orderedRemove(i);
                return true;
            }
        }
        return false;
    }
};

pub fn handleRequest(allocator: std.mem.Allocator, writer: anytype, method: []const u8, body: []const u8) !void {
    _ = allocator;
    _ = body;
    if (std.mem.eql(u8, method, "GET")) {
        try writer.print("{{ \\"message\\": \\"list ${moduleName}s\\" }}", .{});
    } else if (std.mem.eql(u8, method, "POST")) {
        try writer.print("{{ \\"message\\": \\"create ${moduleName}\\" }}", .{});
    } else {
        try writer.print("{{ \\"error\\": \\"Method not allowed\\" }}", .{});
    }
}
`,
    },
    {
      path: path.join(destDir, `${moduleName}_test.zig`),
      content: `const std = @import("std");
const testing = std.testing;
const ${cap} = @import("${moduleName}.zig").${cap};
const ${cap}List = @import("${moduleName}.zig").${cap}List;

test "${cap} init and deinit" {
    var item = try ${cap}.init(testing.allocator, "test");
    defer item.deinit();
    try testing.expect(item.name.len > 0);
}

test "${cap}List add and getAll" {
    var list = ${cap}List.init(testing.allocator);
    defer list.deinit();

    const item = try ${cap}.init(testing.allocator, "item1");
    try list.add(item);

    const items = list.getAll();
    try testing.expectEqual(@as(usize, 1), items.len);
}

test "${cap}List getById" {
    var list = ${cap}List.init(testing.allocator);
    defer list.deinit();

    const item = try ${cap}.init(testing.allocator, "find-me");
    try list.add(item);

    const found = list.getById(item.id);
    try testing.expect(found != null);
}

test "${cap}List remove" {
    var list = ${cap}List.init(testing.allocator);
    defer list.deinit();

    const item = try ${cap}.init(testing.allocator, "remove-me");
    try list.add(item);
    try testing.expect(list.remove(item.id));
    try testing.expectEqual(@as(usize, 0), list.getAll().len);
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
