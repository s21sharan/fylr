# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['chat_agent_runner.py'],
    pathex=[],
    binaries=[],
    datas=[('.env', '.'), ('*.json', '.')],
    hiddenimports=['openai', 'langchain', 'langchain.agents', 'langchain.memory', 'langchain.prompts', 'langchain.chains', 'langchain.llms', 'langchain.chat_models', 'python-dotenv', 'dotenv', 'ollama'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='fylr_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
