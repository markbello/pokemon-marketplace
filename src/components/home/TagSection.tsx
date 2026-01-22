import Image from 'next/image';

export default function TagSection() {
  return (
    <>
      <section className="bg-[#000000] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
          <div className="space-y-4">
            <Image src="/tag-logo.png" alt="TAG" width={90} height={30} className="h-8 w-auto" />
            <h3 className="text-2xl font-semibold">We Partner with TAG</h3>
            <p className="text-sm text-white/70">
              TAG excels in Pok&#233;mon TCG grading through its pioneering AI-driven technology,
              delivering objective, precise evaluations on a granular 1-1000 point scale that
              surpasses the subjectivity of traditional graders like PSA or BGS. Its high-resolution
              imaging pinpoints flaws in corners, edges, surface, and centering with sub-scores and
              annotations, ensuring consistency and eliminating human bias for more reliable results.
            </p>
          </div>
          <div className="flex justify-center">
            <Image
              src="/tag-cards.png"
              alt="TAG graded cards"
              width={880}
              height={520}
              className="h-auto w-full max-w-xl object-contain"
              priority
            />
          </div>
        </div>
      </section>
      <section className="space-y-10 py-8 text-center">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Works seamlessly with TAG</h3>
          <p className="text-muted-foreground text-sm">
            Grade, list, and sell with confidence in three simple steps.
          </p>
        </div>
        <div className="relative mx-auto grid max-w-5xl gap-10 md:grid-cols-3 md:gap-6">
          <div className="border-muted absolute left-1/2 top-8 hidden h-px w-[70%] -translate-x-1/2 md:block" />
          {[
            {
              title: 'Upload your card photo',
              body:
                'Submit clear photos of your card from multiple angles so we can begin the authentication process.',
            },
            {
              title: 'TAG checks your card',
              body:
                'Our experts carefully authenticate and grade your card using industry-standard evaluation criteria.',
            },
            {
              title: 'Receive your card and sell it here',
              body:
                'Get your professionally graded card back and list it on our marketplace with confidence.',
            },
          ].map((step, index) => (
            <div key={step.title} className="flex flex-col items-center gap-4 px-4">
              <div className="bg-neutral-800 text-white flex size-16 items-center justify-center rounded-full text-sm font-semibold">
                Step {index + 1}
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-semibold">{step.title}</h4>
                <p className="text-muted-foreground text-sm">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <button
            type="button"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 py-2 text-sm font-medium transition"
          >
            Learn more
          </button>
        </div>
      </section>
    </>
  );
}
