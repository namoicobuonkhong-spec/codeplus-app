import React from 'react';
import { router } from 'expo-router';
import { Card, Muted, Row, Screen } from '@/ui/kit';
import { useMe } from '@/ui/hooks';
import { can, isManager } from '@/ui/staff';

export default function QuanLi() {
  const me = useMe();
  const items: [boolean, string, string, any, string][] = [
    [isManager(me), 'Tạo ca thi', 'Chọn đề, lớp, tự chia phòng theo tên', 'add-circle-outline', '/cb/taoca'],
    [isManager(me), 'Ngân hàng câu hỏi', 'Trắc nghiệm, đúng/sai, trả lời ngắn, tự luận', 'library-outline', '/cb/nganhang'],
    [isManager(me), 'Đề thi', 'Ghép câu hỏi thành đề', 'document-text-outline', '/cb/de'],
    [can(me, 'kythuat', 'bgh'), 'Học sinh', 'Danh sách theo lớp, cấp tài khoản', 'people-outline', '/cb/hocsinh'],
    [can(me, 'admin'), 'Cán bộ', 'Tài khoản cán bộ, vai trò', 'id-card-outline', '/cb/canbo'],
    [true, 'Thông báo', 'Gửi tới học sinh, xem đã gửi', 'megaphone-outline', '/cb/thongbao'],
    [true, 'Biên bản vi phạm', 'Mọi ca thi', 'warning-outline', '/cb/vipham']
  ];
  const vis = items.filter(x => x[0]);
  return (
    <Screen tone="cb" title="Quản lí">
      <Card pad={false}>
        {vis.map((x, i) => <Row key={x[1]} first={i === 0} tone="cb" title={x[1]} sub={x[2]} icon={x[3]} onPress={() => router.push(x[4])} />)}
      </Card>
      <Muted style={{ textAlign: 'center', fontSize: 12.5 }}>Mục hiện theo vai trò của tài khoản.</Muted>
    </Screen>
  );
}
