import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../lib/auth-context';
import { users } from '../lib/data';
import { Layout } from './Layout';

const renderLayout = async (width: number) => {
  window.innerWidth = width;
  localStorage.setItem('codify_user', JSON.stringify(users.find((user) => user.role === 'student')));

  render(
    <AuthProvider>
      <Layout currentPage="dashboard" onNavigate={() => {}}>
        <div>Dashboard content</div>
      </Layout>
    </AuthProvider>
  );
};

describe('Layout navigation parity', () => {
  it('shows the full student navigation on mobile instead of attendance-only', async () => {
    await renderLayout(390);

    await userEvent.click(await screen.findByLabelText('Open navigation menu'));

    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Problems')).toBeInTheDocument();
    expect(screen.getByText('Contests')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('keeps the student navigation visible on desktop', async () => {
    await renderLayout(1280);

    expect(await screen.findByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Problems')).toBeInTheDocument();
    expect(screen.getByText('Contests')).toBeInTheDocument();
    expect(screen.getByText('Attendance')).toBeInTheDocument();
  });
});
