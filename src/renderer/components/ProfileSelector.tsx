import React from 'react';
import type { Profile } from '../../shared/types';

interface ProfileSelectorProps {
  profiles: Profile[];
  currentProfile: Profile | null;
  onChange: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function ProfileSelector({
  profiles,
  currentProfile,
  onChange,
  onNew,
  onDelete
}: ProfileSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      <div className="input-group" style={{ flex: 1 }}>
        <select
          className="select-input"
          value={currentProfile?.id || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {profiles.length === 0 ? (
            <option value="">No profiles</option>
          ) : (
            profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))
          )}
        </select>
        <span className="select-arrow">▼</span>
      </div>
      <button className="btn" onClick={onNew} title="New Profile">+</button>
      {currentProfile && profiles.length > 1 && (
        <button
          className="btn btn--danger"
          onClick={() => {
            if (confirm(`Delete profile "${currentProfile.name}"?`)) {
              onDelete(currentProfile.id);
            }
          }}
          title="Delete Profile"
        >
          X
        </button>
      )}
    </div>
  );
}
