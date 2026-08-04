import {
  MdDescription,
  MdCode,
  MdMemory,
  MdVisibility,
  MdHub,
  MdWarning,
  MdGroups,
  MdContactSupport,
  MdArticle,
  MdMail,
} from 'react-icons/md'

export default function AboutPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#89ceff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="flex-1 z-10">
          <span className="bg-primary-container text-on-primary-container font-label-md text-label-md px-3 py-1 rounded-full w-fit">AI Research Platform</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Explainable AI in Medical Imaging</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            PneumoniaAI leverages state-of-the-art Convolutional Neural Networks (CNN) and Vision Transformer (ViT) architectures to assist clinicians in the rapid detection of pediatric pneumonia from chest X-ray radiographs. Our mission is to bridge the gap between black-box AI and clinical trust through rigorous explainability protocols.
          </p>
          <div className="flex gap-4 mt-4">
            <button className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-2 shadow-sm">
              <MdDescription className="text-[20px]" /> Read Whitepaper
            </button>
            <button className="bg-surface-container border border-outline-variant text-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2">
              <MdCode className="text-[20px]" /> View GitHub Repo
            </button>
          </div>
        </div>
        <div className="flex-1 w-full max-w-md h-64 md:h-80 rounded-lg overflow-hidden border border-outline-variant relative shadow-sm">
          <img
            className="w-full h-full object-cover opacity-80 mix-blend-screen"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCU_pLndlNMcpn59IjgKC0NrbkfPyNPaXqtrCaVZXIStFY72JxZKHpiwkkAOjhanWhKzDft1AOABIk-7OpmHD_Pq6cYB4uZ9vpl0em2JgU2LM_bDcRQ9y3oHUYjLVCRx2v8EqUbet7lyDn7qy9UDSe3zPFO4oPdVCOsHlXUcPZRxe6HpUjqJHeeEvq5y-1tDKOkotISvrCD4cpaICWY2BL9cbjpfqBvjaneb3m7SCIj0YowrJVXdNjWxA"
            alt="AI visualization"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 to-transparent"></div>
        </div>
      </section>

      {/* Bento Grid */}
      <section>
        <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2 mb-4">
          <MdHub className="text-primary" /> Architecture & Explainability
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl mb-6">
          Our dual-model pipeline ensures high sensitivity while providing visual evidence for its predictions, crucial for clinical adoption.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="col-span-1 md:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col gap-4">
            <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container">
              <MdMemory className="text-[24px]" />
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">CNN & ViT Ensembles</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              We utilize a custom ensemble of ResNet-50 and Swin Transformer models. The CNN captures fine-grained local textures (e.g., consolidation patterns), while the ViT establishes long-range global dependencies across the lung fields, resulting in a highly robust feature extraction process.
            </p>
            <div className="mt-auto pt-4 border-t border-outline-variant/50">
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">Model Accuracy (Test Set)</span>
                <span className="text-primary font-bold">96.4%</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-primary h-full w-[96.4%] rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="col-span-1 md:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center text-primary">
                <MdVisibility className="text-[24px]" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Grad-CAM Visualization</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Gradient-weighted Class Activation Mapping (Grad-CAM) generates a coarse localization map highlighting the important regions in the image for predicting 'Pneumonia'. This provides a visual heatmap overlay, allowing radiologists to cross-reference the AI's area of focus with their own clinical judgment.
              </p>
            </div>
            <div className="flex-1 bg-surface-container rounded-lg border border-outline-variant p-2 flex flex-col gap-2 relative">
              <span className="absolute top-4 left-4 bg-black/60 text-white font-label-sm text-label-sm px-2 py-1 rounded backdrop-blur-sm z-10">Heatmap Overlay</span>
              <img
                className="w-full h-full object-cover rounded shadow-inner mix-blend-luminosity opacity-90"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4g6Y3ffYKGMgznQOS4emx0-thU7Bz2OyOvbXLXO-5m_Bp6vWXV5kjJNowD-cANIXTDm7dMDHJARnXgNCfTCKf1kGDkSCLxbDNhXdn6n2kSFtF6aqdlgw4XA1llyXgO_5zPxlLyT9hxE2zrcpcbPhkA3h88PG4S7eH1lHOVtoNHu7H9cWs_wCAHDypiXWJNqg0KOH-SxrdXK6fviUvVb6frQer2hdWxlggBcaCXonoDeoKgmHNjWwnHg"
                alt="Grad-CAM heatmap"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-error-container text-on-error-container rounded-xl p-6 flex items-start gap-4 shadow-sm border border-error/20">
        <MdWarning className="text-[28px] text-error shrink-0 mt-1" />
        <div>
          <h3 className="font-headline-md text-headline-md font-bold mb-1">Research Disclaimer</h3>
          <p className="font-body-md text-body-md">
            For clinical decision support only. Not a substitute for professional medical judgment. PneumoniaAI is a research tool intended to augment radiologic workflows and is currently undergoing clinical validation. Do not use for definitive primary diagnosis without expert consultation.
          </p>
        </div>
      </section>

      {/* Contact & Team */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md flex items-center gap-2">
            <MdGroups className="text-secondary" /> Research Team
          </h3>
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center font-bold text-primary">DS</div>
              <div>
                <p className="font-label-md text-label-md text-on-surface">Dr. Sarah Jenkins</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Lead AI Researcher, Stanford Med</p>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center font-bold text-primary">MC</div>
              <div>
                <p className="font-label-md text-label-md text-on-surface">Marcus Chen, PhD</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Computer Vision Engineer</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-md text-headline-md flex items-center gap-2">
            <MdContactSupport className="text-secondary" /> Contact & Resources
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Interested in collaborating or integrating our API into your clinical trials? Reach out to our research team.
          </p>
          <div className="flex flex-col gap-3 mt-auto">
            <a className="flex items-center gap-2 font-label-md text-label-md text-primary hover:underline" href="mailto:research@pneumonia.ai">
              <MdMail className="text-[18px]" /> research@pneumonia.ai
            </a>
            <a className="flex items-center gap-2 font-label-md text-label-md text-primary hover:underline" href="#">
              <MdArticle className="text-[18px]" /> Published Papers (PubMed)
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}