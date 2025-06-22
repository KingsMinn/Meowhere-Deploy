'use client';

import { useGnb } from '@/src/hooks/useGnb';
import { useRouter, useParams } from 'next/navigation';
import RegisterExperienceForm, {
  RegisterExperienceFormRef,
} from '../../components/RegisterExperienceForm';
import { useUpdateMyActivityMutation } from '@/src/hooks/useUpdateMyActivityMutation';
import { useActivityDetail } from '@/src/hooks/activities/useActivityDetail';
import { useState, useRef, useEffect } from 'react';
import { MyActivitiesFormData, UpdateMyActivityPayload } from '@/src/types/my-activities.types';
import { buildUpdateActivityPayload } from '@/src/utils/my-activities';
import SkeletonRegisterForm from '../../components/skeleton-ui/SkeletonRegisterForm';
import { useGnbStore } from '@/src/store/gnbStore';
import { useQueryClient } from '@tanstack/react-query';

export default function EditActivityPage() {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<RegisterExperienceFormRef>(null);
  const [formState, setFormState] = useState({ isDirty: false, isValid: false });
  const { setRightButtons } = useGnbStore();
  const queryClient = useQueryClient();

  // URL에서 activityId 추출
  const activityId = typeof params.id === 'string' ? parseInt(params.id, 10) : undefined;

  // 상세조회 & 수정 훅 호출
  const { data: activityDetail, isLoading, error } = useActivityDetail(activityId!);
  const updateMyActivityMutation = useUpdateMyActivityMutation(activityId);

  useEffect(() => {
    setRightButtons([
      <button
        key='submit'
        form='register-form'
        onClick={() => formRef.current?.submit()}
        className='text-md font-semibold text-primary-300 disabled:text-gray-300'
        disabled={updateMyActivityMutation.isPending || !formState.isDirty || !formState.isValid}
      >
        수정
      </button>,
    ]);
  }, [formState, updateMyActivityMutation.isPending, setRightButtons]);
  useGnb({
    title: '내 체험 수정',
    subtitle: '',
    backAction: () => router.back(),
    rightButtons: [],
  });

  const handleSubmit = async (formData: MyActivitiesFormData) => {
    if (isSubmitting) return;
    if (!activityDetail) return;

    setIsSubmitting(true);

    try {
      // 기존 이미지 URL 리스트
      const existingUrls = activityDetail.subImages.map((img) => img.imageUrl);

      // subImageUrlsToAdd: 기존에 없던 URL만 남김
      const subImageUrlsToAdd = formData.subImageUrls.filter((url) => !existingUrls.includes(url));

      // 기존에는 있었지만 현재 폼에 없는 이미지
      const subImageIdsToRemove = activityDetail.subImages
        .filter((img) => !formData.subImageUrls.includes(img.imageUrl))
        .map((img) => img.id);

      // 서버에 보낼 payload 구성
      const payload: UpdateMyActivityPayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: formData.price,
        address: formData.address,
        bannerImageUrl: formData.bannerImageUrl,
        subImageUrlsToAdd, // 여기엔 기존 URL 제외된 새 이미지만
        subImageIdsToRemove,
        schedulesToAdd: [], // 필요시 스케줄 로직 추가
        scheduleIdsToRemove: [],
      };

      console.log('📤 PATCH payload:', payload);

      await updateMyActivityMutation.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
      router.push('/profile/my-activities');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 에러, 로딩 상태에 따른 렌더링
  if (error) {
    router.push('/profile/my-activities');
    return null;
  }

  if (isLoading || !activityDetail) {
    return (
      <div className='w-full flex-1'>
        <SkeletonRegisterForm />
      </div>
    );
  }

  return (
    <RegisterExperienceForm
      ref={formRef}
      mode='edit'
      onSubmit={handleSubmit}
      defaultValues={updateMyActivityMutation.transformActivityToFormData(activityDetail)}
      isSubmitting={isSubmitting}
      onFormStateChange={setFormState}
    />
  );
}
