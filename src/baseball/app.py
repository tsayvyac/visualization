from __future__ import annotations

import pathlib
import sys

import streamlit as st
from streamlit.web import cli as stcli


def main() -> None:
    st.set_page_config(page_title="Viz", page_icon="⚾", layout="centered")

    st.title("Hello, world")
    st.write(
        "This is a minimal Streamlit app. If you can see this, your setup works."
    )

    st.divider()
    st.caption("Edit `src/baseball/app.py` and Streamlit will hot-reload.")


def run() -> None:
    """Entry point for poetry script to launch streamlit."""
    sys.argv = ["streamlit", "run", str(pathlib.Path(__file__))]
    sys.exit(stcli.main())


if __name__ == "__main__":
    main()
