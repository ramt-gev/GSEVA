import PersonTypeTable from '../components/PersonTypeTable';
import VfSlotsCard from '../components/VfSlotsCard';

export default function Guests() {
  return (
    <>
      <VfSlotsCard />
      <PersonTypeTable
        types="room_guest,free_day_visitor,paid_day_visitor,corporate_tour_group,vip_dignitary"
        emptyLabel="Guests & Day Visitors"
        showDepartment={false}
        showPresentToday={false}
      />
    </>
  );
}
