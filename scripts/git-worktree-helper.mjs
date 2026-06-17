#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { unlinkSync, rmdirSync, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute a callback within a git worktree
 * @param {string} dir - Directory path for the worktree
 * @param {string} branch - Branch name to checkout
 * @param {Function} callback - Function to execute within the worktree
 */
export async function withGitWorktree(dir, branch, callback) {
    const worktreeDir = resolve(__dirname, "..", dir);

    console.log(`🌳 Creating git worktree at ${worktreeDir} for branch ${branch}...`);

    // Create worktree
    const gitWorktreeAdd = spawn("git", ["worktree", "add", worktreeDir, branch], {
        stdio: "inherit"
    });

    await new Promise((resolve, reject) => {
        gitWorktreeAdd.on("close", (code) => {
            if (code !== 0) {
                reject(new Error("Git worktree add failed"));
                return;
            }
            resolve();
        });
        gitWorktreeAdd.on("error", reject);
    });

    try {
        // Execute callback
        await callback(worktreeDir);
    } finally {
        // Before removing the work tree, commit and push the added content

        // Step 3: Commit and push to blog-posts branch
        console.log("📤 Committing and pushing to blog-posts branch...");
        const gitAdd = spawn("git", ["add", "-A"], {
            cwd: worktreeDir,
            stdio: "inherit"
        });

        await new Promise((resolve, reject) => {
            gitAdd.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error("Git add failed"));
                    return;
                }
                resolve();
            });
            gitAdd.on("error", reject);
        });

        const gitCommit = spawn("git", ["commit"], {
            cwd: worktreeDir,
            stdio: "inherit"
        });

        await new Promise((resolve, reject) => {
            gitCommit.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error("Git commit failed"));
                    return;
                }
                resolve();
            });
            gitCommit.on("error", reject);
        });

        const gitPush = spawn("git", ["push", "origin", "blog-posts"], {
            cwd: worktreeDir,
            stdio: "inherit"
        });

        await new Promise((resolve, reject) => {
            gitPush.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error("Git push failed"));
                    return;
                }
                resolve();
            });
            gitPush.on("error", reject);
        });

        console.log(`🗑️  Removing git worktree at ${worktreeDir}...`);
        try {
            const gitWorktreeRemove = spawn("git", ["worktree", "remove", worktreeDir], {
                stdio: "inherit"
            });

            await new Promise((resolve, reject) => {
                gitWorktreeRemove.on("close", (code) => {
                    if (code !== 0) {
                        reject(new Error("Git worktree remove failed"));
                        return;
                    }
                    resolve();
                });
                gitWorktreeRemove.on("error", reject);
            });

            console.log("✅ Worktree removed successfully");
        } catch (error) {
            console.error("⚠️  Failed to remove worktree, please remove manually:", worktreeDir);
            throw error;
        }
    }
}

// Example usage:
// await withGitWorktree(".worktree-blog", "blog-posts", async (worktreeDir) => {
//   // Your code here
//   console.log("Working in worktree:", worktreeDir);
// });