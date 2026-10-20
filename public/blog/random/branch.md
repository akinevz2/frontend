# When does calling a function count as a branch on an x86_64 CPU

On an x86_64 CPU, calling a function always counts as a branch from the perspective of the hardware's execution flow, but how it is treated depends on the context of the hardware mechanism you are looking at.

Here is exactly how function calls interact with different CPU structures:

## 1. Architectural Execution

Architecturally, a function call is a conditional or unconditional control flow transfer.
- The CALL instruction alters the Instruction Pointer (RIP) by pushing the return address to the stack and jumping to the target address.
- Because it changes the sequential execution path, it is fundamentally a branch.

## 2. Performance Monitors (PMUs & Performance Counters)

If you are profiling code using tools like perf or Intel VTune, the CPU categorizes function calls based on the specific hardware counter:
- BR_INST_RETIRED.ALL_BRANCHES: A standard CALL instruction (whether near or far) always increments this counter.
- BR_INST_RETIRED.NEAR_CALL: Most modern x86_64 CPUs have specific sub-counters that track function calls explicitly.
- BR_INST_RETIRED.CONDITIONAL: A function call will not count here unless it is wrapped in a conditional wrapper (e.g., executing a call only if a JZ condition is met, where the JZ is the conditional branch, not the CALL itself).

3. Branch Prediction Unit (BPU)

The CPU's internal hardware treats function calls as branches, but handles them using two different internal structures depending on how the function is invoked:

- Direct Calls (`CALL <label>`): These are treated as unconditional static branches. The target address is explicitly encoded in the instruction, so the CPU's Branch Target Buffer (BTB) easily predicts the target with near-100% accuracy.
- Indirect Calls (`CALL RAX` or `CALL QWORD PTR [RBP-8]`): These occur during virtual method calls (C++ vtables), function pointers, or interface dispatches. The CPU treats these as indirect branches and must use complex indirect branch predictors to guess the target address based on prior history.

## The "Return" Exception: Return Address Stack (RAS)

While the CALL instruction is a forward branch, the corresponding RET instruction is also a branch (an indirect one). However, modern x86_64 CPUs use a dedicated Return Address Stack (RAS) to predict RET targets rather than the standard branch predictor. If you mismatch your CALL and RET instructions (e.g., by manually popping the stack), you will cause a RAS misprediction, which behaves exactly like a severe branch misprediction penalty.