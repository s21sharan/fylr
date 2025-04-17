#!/usr/bin/env python3
"""
Script to collect and analyze imports used in the application
to help identify missing modules for PyInstaller
"""
import os
import sys
import importlib
import pkgutil
import inspect
import modulefinder
import json

def find_all_imports(start_script):
    """Find all imports in a script and its dependencies"""
    print(f"Analyzing imports starting from {start_script}...")
    
    # Use modulefinder to find all imports
    finder = modulefinder.ModuleFinder()
    finder.run_script(start_script)
    
    # Collect modules
    modules = {}
    for name, mod in finder.modules.items():
        if name != "__main__":
            modules[name] = {
                "name": name,
                "file": getattr(mod, "__file__", None)
            }
    
    # Sort modules by name
    sorted_modules = dict(sorted(modules.items()))
    
    return sorted_modules

def analyze_langchain_and_pydantic():
    """Analyze langchain and pydantic package structures"""
    results = {}
    
    for package_name in ["langchain", "langchain_core", "pydantic"]:
        try:
            package = importlib.import_module(package_name)
            results[package_name] = {
                "path": getattr(package, "__file__", None),
                "submodules": []
            }
            
            # Try to find all submodules
            try:
                package_path = os.path.dirname(package.__file__)
                for _, name, is_pkg in pkgutil.walk_packages([package_path], f"{package_name}."):
                    results[package_name]["submodules"].append(name)
            except Exception as e:
                print(f"Error walking package {package_name}: {str(e)}")
                
        except ImportError:
            print(f"Package {package_name} is not installed")
    
    return results

def main():
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python collect_imports.py <script.py>")
        sys.exit(1)
    
    script_path = sys.argv[1]
    if not os.path.exists(script_path):
        print(f"Error: Script {script_path} not found")
        sys.exit(1)
    
    # Find all imports
    imports = find_all_imports(script_path)
    
    # Analyze specific packages
    package_analysis = analyze_langchain_and_pydantic()
    
    # Combine results
    results = {
        "script": script_path,
        "imports": imports,
        "package_analysis": package_analysis
    }
    
    # Save to file
    output_file = "imports_analysis.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\nAnalysis complete. Results saved to {output_file}")
    
    # Generate PyInstaller hidden imports
    hidden_imports = []
    
    # Add all top-level imports
    for module_name in imports.keys():
        base_module = module_name.split('.')[0]
        if base_module not in hidden_imports:
            hidden_imports.append(base_module)
    
    # Add specific packages and their submodules
    for package_name, package_data in package_analysis.items():
        if package_name not in hidden_imports:
            hidden_imports.append(package_name)
        
        # Add important submodules
        for submodule in package_data.get("submodules", []):
            if submodule not in hidden_imports:
                hidden_imports.append(submodule)
    
    # Print PyInstaller hidden imports format
    print("\nSuggested PyInstaller hidden imports:")
    print("hiddenimports=[")
    for module in sorted(hidden_imports):
        print(f"    '{module}',")
    print("]")

if __name__ == "__main__":
    main() 