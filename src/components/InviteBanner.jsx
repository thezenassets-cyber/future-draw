export default function InviteBanner({ inviter }) {
  if (!inviter) return null
  const first = inviter.name.trim().split(/\s+/)[0]
  return (
    <p className="invite-banner">
      {first} invited you. Finish a free entry and you are in the draw. {first} receives one
      extra chance. An invite is not a win.
    </p>
  )
}
