# UDS Diagnostics Command Explorer

A comprehensive interactive web application for exploring, searching, visualizing, and learning UDS (Unified Diagnostic Services, ISO 14229) automotive diagnostic protocol commands. Built with Next.js 16, React 19, TypeScript, and shadcn/ui.

## Purpose

Provides automotive engineers, technicians, and students with a complete reference tool for UDS diagnostic services. Features include command browsing by service group, AI-powered natural language search, and an interactive CAN bus protocol visualizer.

## Key Features

- **Command Explorer**: Browse 35+ UDS diagnostic services across 5 functional groups, with filtering and search
- **AI Search**: Chat-based assistant with full UDS database context, supporting cloud and local LLMs
- **Protocol Visualizer**: Animated CAN bus sequence diagrams for common diagnostic workflows
- **Custom Commands**: Import/export custom UDS command definitions via JSON, with CRUD management
- **Protocol Reference**: Comprehensive negative response codes, sub-functions, DIDs, timing parameters

## Architecture

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **UI Library**: shadcn/ui components (60+ Radix-based primitives)
- **State Management**: Zustand for custom commands store with localStorage persistence
- **Database**: SQLite via Prisma (basic schema for User/Post)
- **Animation**: Framer Motion for transitions and sequence animations
- **Styling**: Tailwind CSS 4 with dark/light theme support

## Tech Stack

- Next.js 16 (standalone output)
- React 19, TypeScript 5
- Tailwind CSS 4
- Prisma + SQLite
- Zustand 5
- Framer Motion 12
- dnd-kit, TanStack Query, TanStack Table
- shadcn/ui component library
- next-themes for theme management
- sonner for toast notifications

## Target Audience

Automotive diagnostic engineers, ECU calibration engineers, service technicians, and students learning automotive protocols.