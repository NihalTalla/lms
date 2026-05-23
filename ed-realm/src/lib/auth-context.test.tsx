import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './auth-context';
import { users } from './data';

function AuthProbe() {
  const { currentUser } = useAuth();
  return <div>{currentUser ? currentUser.name : 'Guest'}</div>;
}

describe('AuthProvider', () => {
  it('restores the saved user from localStorage on refresh', async () => {
    localStorage.setItem('codify_user', JSON.stringify(users[0]));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(await screen.findByText(users[0].name)).toBeInTheDocument();
  });
});
