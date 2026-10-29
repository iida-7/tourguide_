export function SiteFooter() {
  return (
    <footer className="print-hidden border-t-[1.5px] border-dashed border-ink/60 py-6">
      <p className="mx-auto max-w-[1080px] px-4 text-center text-xs leading-relaxed text-muted-foreground md:px-6">
        본 감정 결과는 입력하신 일정 원문을 기반으로 한 참고용 정보이며, 실제 여행사 약관·현지 사정과 다를 수 있습니다.
        <br className="hidden md:block" /> 계약 전에는 반드시 여행사의 공식 안내를 다시 확인해 주세요.
      </p>
    </footer>
  )
}
