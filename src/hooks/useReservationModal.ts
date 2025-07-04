import { useEffect, useState } from 'react';

import { useReservedSchedules } from './useReservedSchedules';
import { useReservationsByTime } from './useReservationsByTime';
import { useUpdateReservation } from './useUpdateReservation';
import { DropdownItemButton } from '../types/dropdown.types';
import { ModalReservationStatus, ReservedSchedule } from '../types/reservation.types';

export function useReservationModal(activityId: number, date: Date) {
  const [reservationStatus, setReservationStatus] = useState<ModalReservationStatus>('pending');
  const [selectedSchedule, setSelectedSchedule] = useState<ReservedSchedule | null>(null);
  const [dropdownItems, setDropdownItems] = useState<DropdownItemButton[]>([]);

  const { data: schedules = [] } = useReservedSchedules(activityId, date);

  const { data: reservationsByTime = [] } = useReservationsByTime(
    activityId,
    selectedSchedule?.scheduleId,
    reservationStatus
  );

  const { mutate: updateReservation } = useUpdateReservation(
    activityId,
    selectedSchedule?.scheduleId
  );

  // 예약 상태 종류 버튼을 클릭했을 때 실행되는 함수
  const handleReservationStatus = (status: ModalReservationStatus) => {
    setReservationStatus(status);

    if (schedules.length) setSelectedSchedule(schedules[0]);
  };

  const handleReservationUpdate = async (
    reservationId: number,
    status: 'confirmed' | 'declined'
  ) => {
    if (status == 'confirmed') {
      const others = reservationsByTime.filter((reservation) => reservation.id !== reservationId);

      // 1. 승인 요청부터 먼저 전송
      updateReservation({ reservationId, status });

      // 2. 나머지 declined 요청 병렬 처리
      await Promise.all(
        others.map((reservation) =>
          updateReservation({ reservationId: reservation.id, status: 'declined' })
        )
      );
    } else {
      updateReservation({ reservationId, status });
    }
  };

  useEffect(() => {
    if (schedules.length > 0) {
      setSelectedSchedule(schedules[0]);
      setDropdownItems(
        schedules.map((schedule) => ({
          label: `${schedule.startTime} ~ ${schedule.endTime}`,
          onClick: () => setSelectedSchedule(schedule),
        }))
      );
    }
  }, [schedules]);

  return {
    reservationStatus,
    selectedSchedule,
    dropdownItems,
    reservationsByTime,
    handleReservationStatus,
    handleReservationUpdate,
  };
}
