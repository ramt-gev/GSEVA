const { sequelize, Person, PersonStay, QrPass, AuditLog } = require('../models');
const qrService = require('./qrService');
const whatsappService = require('./whatsappService');
const { UnauthorizedError } = require('../errors/AppError');

function verifySecret(headerSecret) {
  if (headerSecret !== process.env.EZEE_WEBHOOK_SECRET) {
    throw new UnauthorizedError('Unauthorized');
  }
}

// Match by mobile — room_guest mobile is unique (partial-unique excludes
// staff_dependant only). Wrapped in a transaction: the Postgres backend
// does NOT do this (each write is a separate pool.query), which risks a
// partial write (e.g. person_stays created but the QR pass insert fails,
// leaving a guest with no way to enter). Every other multi-step write in
// this backend (registerVisitor, registerStaff, approvePerson, createSevak)
// is already transactional — this makes eZee bookings consistent with that,
// for a webhook representing one real booking event.
async function handleBooking(headerSecret, booking) {
  verifySecret(headerSecret);

  const { GuestName, GuestMobile, CheckIn, CheckOut, BookingID, Adults } = booking;

  let qrPass;
  const person_id = await sequelize.transaction(async (t) => {
    const existing = await Person.findOne({
      where: { mobile: GuestMobile, person_type: 'room_guest' },
      transaction: t,
    });

    let person;
    if (existing) {
      await existing.update(
        { full_name: GuestName, ezee_guest_id: BookingID, status: 'on_campus' },
        { transaction: t }
      );
      await QrPass.update({ is_active: false }, { where: { person_id: existing.person_id }, transaction: t });
      person = existing;
    } else {
      person = await Person.create(
        {
          full_name: GuestName, person_type: 'room_guest', mobile: GuestMobile,
          ezee_guest_id: BookingID, status: 'on_campus', registration_source: 'ezee_sync',
        },
        { transaction: t }
      );
    }

    await PersonStay.create(
      {
        person_id: person.person_id, stay_type: 'overnight', check_in_date: CheckIn, check_out_date: CheckOut,
        is_overnight: true, is_active: true, ezee_reservation_id: BookingID, booking_source: 'ezee',
      },
      { transaction: t }
    );

    qrPass = await QrPass.create(
      {
        person_id: person.person_id, pass_type: 'stay_pass', zone_access: qrService.getZoneAccess('room_guest'),
        valid_from: CheckIn, valid_until: CheckOut, group_size: Adults || 1, is_active: true,
      },
      { transaction: t }
    );

    await AuditLog.create(
      {
        user_id: null, action: 'EZEE_BOOKING', module: 'webhook_ezee', table_name: 'persons',
        record_id: person.person_id, new_value: { booking_id: BookingID, guest: GuestName },
      },
      { transaction: t }
    );

    return person.person_id;
  });

  if (GuestMobile) {
    whatsappService
      .sendQRPass(GuestMobile, qrService.getQRPublicURL(qrPass.qr_id), GuestName, new Date(CheckOut).toLocaleDateString('en-IN'))
      .catch((err) => console.error('WhatsApp failed:', err.message));
  }

  return { person_id, qr_id: qrPass.qr_id };
}

async function handleCheckout(headerSecret, { BookingID, GuestMobile }) {
  verifySecret(headerSecret);

  await sequelize.transaction(async (t) => {
    await PersonStay.update(
      { is_active: false, actual_check_out: new Date() },
      { where: { ezee_reservation_id: BookingID }, transaction: t }
    );

    const guests = await Person.findAll({
      where: { mobile: GuestMobile, person_type: 'room_guest' },
      transaction: t,
    });
    const guestIds = guests.map((g) => g.person_id);

    await Person.update(
      { status: 'departed' },
      { where: { mobile: GuestMobile, person_type: 'room_guest' }, transaction: t }
    );

    if (guestIds.length > 0) {
      await QrPass.update({ is_active: false }, { where: { person_id: guestIds }, transaction: t });
    }

    await AuditLog.create(
      {
        user_id: null, action: 'EZEE_CHECKOUT', module: 'webhook_ezee', table_name: 'persons',
        new_value: { booking_id: BookingID, mobile: GuestMobile },
      },
      { transaction: t }
    );
  });

  return { success: true };
}

module.exports = { handleBooking, handleCheckout };
