import { exec } from "child_process";
import { promisify } from "util";
import { log } from "../index";

const execAsync = promisify(exec);

/**
 * Execute a command within a conda environment.
 * 
 * Supports both activated conda environments and direct tool installation.
 * Falls back to direct execution if conda is not available.
 * 
 * @param command - The command to execute (e.g., "mafft --auto input.fasta")
 * @param envName - Optional conda environment name (default: "bioinformatics")
 * @param cwd - Working directory for the command
 * @returns Promise with stdout and stderr
 */
export async function executeInCondaEnv(
  command: string,
  envName: string = "bioinformatics",
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    // Try with conda environment first
    const condaCommand = `conda run -n ${envName} ${command}`;
    log(`Executing in conda env: ${condaCommand}`, "bioinformatics");
    
    try {
      const result = await execAsync(condaCommand, { 
        cwd,
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      });
      return result;
    } catch (condaErr: any) {
      // If conda env doesn't exist or conda not available, try direct execution
      if (condaErr.message?.includes("no such file or directory") || 
          condaErr.message?.includes("not found") ||
          condaErr.message?.includes("conda")) {
        log(`Conda env or command not found, trying direct execution: ${command}`, "bioinformatics");
        const result = await execAsync(command, { 
          cwd,
          timeout: 300000,
          maxBuffer: 10 * 1024 * 1024
        });
        return result;
      }
      throw condaErr;
    }
  } catch (err: any) {
    const errorMsg = `Failed to execute command: ${command}\n${err.message}`;
    log(errorMsg, "bioinformatics");
    throw new Error(errorMsg);
  }
}

/**
 * Check if a tool is available in the conda environment or system PATH.
 * @param tool - Tool name (e.g., "mafft", "iqtree2")
 * @param envName - Optional conda environment name
 * @returns True if tool is available
 */
export async function isToolAvailable(
  tool: string,
  envName: string = "bioinformatics"
): Promise<boolean> {
  try {
    const command = process.platform === "win32" 
      ? `where ${tool}`
      : `which ${tool}`;
    
    const condaCommand = `conda run -n ${envName} ${command}`;
    await execAsync(condaCommand);
    return true;
  } catch {
    // Try without conda
    try {
      const command = process.platform === "win32" 
        ? `where ${tool}`
        : `which ${tool}`;
      await execAsync(command);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get setup instructions for installing required tools in conda environment.
 */
export function getSetupInstructions(): string {
  return `
To set up bioinformatics tools, run these commands on your Ubuntu server:

# Create conda environment with required tools
conda create -n bioinformatics -c bioconda -c conda-forge mafft iqtree r-base

# Or install individually:
conda activate bioinformatics
conda install -c bioconda mafft
conda install -c bioconda iqtree
conda install -c conda-forge r-base

# Verify installation:
conda run -n bioinformatics mafft --version
conda run -n bioinformatics iqtree2 --version
`;
}
