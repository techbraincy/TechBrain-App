interface Props {
  reference: string
}

export function ReferenceTag({ reference }: Props) {
  return (
    <span className="reference-tag" aria-label={`Reference ${reference}`}>
      {reference}
    </span>
  )
}
