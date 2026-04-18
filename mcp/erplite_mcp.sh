#!/bin/bash
# Fixed entry point for ERPLite MCP Server
# Using erplite_mcp_updated.py as the source of truth
exec /home/opengrace/supplyxerp/mcp/venv/bin/python3 /home/opengrace/supplyxerp/mcp/erplite_mcp_updated.py "$@"
