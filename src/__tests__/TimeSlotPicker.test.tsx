import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimeSlotPicker from '../../App'; // Adjust import path if needed

test('slot 17h is disabled when appointment exists', () => {
  const selectedDate = new Date('2026-04-23T00:00:00');
  const appointments = [
    {
      id: 1,
      appointment_time: '2026-04-23T17:00:00',
      status: 'AGENDADO',
      service: 'Pet Móvel',
    },
  ];
  const workingHours = [17, 18];
  render(
    <TimeSlotPicker
      selectedDate={selectedDate}
      selectedService={null}
      appointments={appointments}
      onTimeSelect={() => {}}
      selectedTime={null}
      workingHours={workingHours}
      isPetMovel={true}
      allowedDays={[]}
      selectedCondo={null}
      disablePastTimes={false}
      isAdmin={false}
    />
  );
  const button = screen.getByRole('button', { name: /17:00/i });
  expect(button).toBeDisabled();
});
