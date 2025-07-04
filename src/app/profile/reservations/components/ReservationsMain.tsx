'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useToastStore } from '@/src/store/toastStore';

import { useGnb } from '@/src/hooks/useGnb';
import { useInfiniteReservations } from '@/src/hooks/useInfiniteReservations';
import { MY_RESERVATION_STATUS_MAP } from '@/src/constants/my-reservation-status';
import { MyReservationStatus } from '@/src/types/profile-reservation.types';
import { DropdownItemButton } from '@/src/types/dropdown.types';

import Dropdown from '@/src/components/common/dropdowns/Dropdown';
import ReservationsCard from './ReservationsCard';
import NoActivities from '../../components/NoActivities';
import SkeletonActivities from '../../my-activities/components/skeleton-ui/SkeletonActivities';

const BOTTOM_SKELETON_COUNT = 3; // 하단 스켈레톤 개수

export default function ReservationsPage() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const [selectedStatus, setSelectedStatus] = useState<MyReservationStatus>('all');
  const {
    data: myReservationsResponse,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteReservations(selectedStatus);
  const myReservations = myReservationsResponse?.pages.flatMap((page) => page.reservations) ?? [];
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 드롭다운 메뉴 아이템 데이터
  const reservationStatusItems: DropdownItemButton[] = [
    { label: '모든 예약', onClick: () => setSelectedStatus('all') },
    { label: '예약 완료', onClick: () => setSelectedStatus('pending') },
    { label: '예약 승인', onClick: () => setSelectedStatus('confirmed') },
    { label: '예약 취소', onClick: () => setSelectedStatus('canceled') },
    { label: '예약 거절', onClick: () => setSelectedStatus('declined') },
    { label: '체험 완료', onClick: () => setSelectedStatus('completed') },
  ];

  useGnb({
    title: '예약 내역',
    backAction: () => router.push('/profile'),
    rightButtons: [
      <div key='icon-filter'>
        <Dropdown
          dropdownItems={reservationStatusItems}
          selectedValue={selectedStatus}
          bottomSheetTitle='체험 상태'
          trigger={
            <Image
              className='fill-black'
              src='/assets/icons/ico-filter.svg'
              width={24}
              height={24}
              alt='필터 아이콘'
            />
          }
        />
      </div>,
    ],
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
            .catch((err) => console.error(err))
            .finally(() => {
              // 호출이 끝나면 다시 observe
              observer.observe(entry.target);
            });
        }
      });
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (isError) {
      showToast('error', '예약 목록 조회 중 에러가 발생했습니다. 다시 시도해주세요.');
    }
  }, [isError, showToast]);

  return (
    <main className='flex flex-col items-center pb-[88px] lg:pb-0'>
      <div className='w-full flex flex-col lg:max-w-[720px] lg:mx-auto'>
        <div className='hidden lg:flex lg:justify-end'>
          <div className='w-[180px]'>
            <Dropdown
              dropdownItems={reservationStatusItems}
              triggerLabel='체험 상태'
              selectedValue={MY_RESERVATION_STATUS_MAP[selectedStatus].label}
              bottomSheetTitle='체험 상태'
            />
          </div>
        </div>
        {isLoading ? (
          <div className='w-full flex flex-col lg:max-w-[720px] lg:mx-auto'>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className='mt-[24px]'>
                <SkeletonActivities />
              </div>
            ))}
          </div>
        ) : (
          <>
            {myReservations && myReservations.length > 0 ? (
              <div className='flex flex-col'>
                {myReservations.map((reservation, index) => (
                  <ReservationsCard
                    key={reservation.id}
                    reservation={reservation}
                    showCancel={reservation.status === 'pending'}
                    showReview={reservation.status === 'completed' && !reservation.reviewSubmitted}
                    isLast={index === myReservations.length - 1}
                  />
                ))}
                {/* 추가 페이지 로딩 시 하단 스켈레톤 */}
                {isFetchingNextPage &&
                  Array.from({ length: BOTTOM_SKELETON_COUNT }).map((_, idx) => (
                    <div key={`skeleton-bottom-${idx}`} className='mb-[48px]'>
                      <SkeletonActivities />
                    </div>
                  ))}
                {/* 마지막 요소 감지용 */}
                <div ref={sentinelRef} className='h-[1px]' />
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center h-full'>
                <NoActivities title='예약한' urlPath='/' buttonTitle='체험 예약하러 가기' />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
