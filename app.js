// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://eithnnxevoqckkzhvnci.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGhubnhldm9xY2tremh2bmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODQ4MjYsImV4cCI6MjA3NTc2MDgyNn0.wEuqy7mtia_5KsCWwD83LXMgOyZ8nGHng7nMVxGp-Ig',
    FORMSPREE_ENDPOINT: 'https://formspree.io/f/xldppdop',
    WAITLIST_WEBHOOK: 'https://hook.us2.make.com/epjxwhxy1kyfikc75m6f8gw98iotjk20'
};

// Initialize Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Survey Questions
const SURVEY_QUESTIONS = [
 
    { "id": "P0_contraception",
      "type": "single_choice",
      "title": "¿Usas anticoncepción actualmente? 🛡️",
      "help_text": "Nos ayuda a interpretar mejor tus señales.",
      "options": [
        { "label": "Píldora/anillo/parche", "value": "hormonal_sistemica" },
        { "label": "Implante/inyección", "value": "hormonal_larga" },
        { "label": "DIU hormonal", "value": "diu_hormonal" },
        { "label": "DIU de cobre", "value": "diu_cobre" },
        { "label": "Ninguna", "value": "ninguna" },
        { "label": "Otro", "value": "otro" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P1",
      "type": "single_choice",
      "title": "¿Cómo ha sido tu ciclo en los últimos 3 meses? ⏱️",
      "help_text": "Elige la opción que mejor te describa.",
      "options": [
        { "label": "Regular (24–35 días)", "value": "Regular (24–35 días)" },
        { "label": "Irregular (varía >7 días entre ciclos)", "value": "Irregular (varía >7 días entre ciclos)" },
        { "label": "No tengo sangrado actualmente", "value": "No tengo sangrado actualmente" }
      ],
      "notes_map": {
        "Regular (24–35 días)": "P1_regular_copy_hint",
        "Irregular (varía >7 días entre ciclos)": "P1_irregular_copy_hint",
        "No tengo sangrado actualmente": "P1_no_cycle_copy_hint"
      },
      "modes": ["regular","pro"]
    },
    { "id": "P1_motivo_no_ciclo",
        "type": "single_choice",
        "title": "Si no hay sangrado, ¿cuál es la razón principal? 🌙",
        "help_text": "Nos ayuda a personalizar tus recomendaciones.",
        "visible_if": {
          "question_id": "P1",
          "equals": "No tengo sangrado actualmente"
        },
        "options": [
          {
            "label": "Menopausia",
            "value": "Menopausia"
          },
          {
            "label": "Post-píldora (<6 meses)",
            "value": "Post-píldora (<6 meses)"
          },
          {
            "label": "Post-píldora (≥6 meses)",
            "value": "Post-píldora (≥6 meses)"
          },
          {
            "label": "Amenorrea por otras causas",
            "value": "Amenorrea por otras causas"
          }
        ]
    },
    { "id": "P1_amenorrea_contexto",
        "type": "multi_select",
        "title": "Factores que aplican (opcional) 🧩",
        "help_text": "Selecciona los que apliquen.",
        "visible_if": {
          "question_id": "P1",
          "equals": "No tengo sangrado actualmente"
        },
        "options": [
          {
            "label": "Lactancia",
            "value": "lactancia"
          },
          {
            "label": "Cambios de peso recientes",
            "value": "cambios_peso"
          },
          {
            "label": "Estrés alto",
            "value": "estres_alto"
          },
          {
            "label": "Ejercicio intenso",
            "value": "ejercicio_intenso"
          },
          {
            "label": "Antecedentes tiroideos",
            "value": "antecedentes_tiroideos"
          }
        ],
        "validation": {
          "min_selected": 0,
          "max_selected": 5
        }
    },
    { "id": "P1_onset_timing",
        "type": "single_choice",
        "title": "¿Cómo empezaron esos cambios? ⏳",
        "help_text": "Opcional. Aporta contexto.",
        "visible_if": {
          "question_id": "P1",
          "equals": "No tengo sangrado actualmente"
        },
        "options": [
          {
            "label": "Súbito tras suspender anticoncepción",
            "value": "súbito_post_pildora"
          },
          {
            "label": "Gradual (meses/años)",
            "value": "gradual"
          },
          {
            "label": "Posparto",
            "value": "posparto"
          },
          {
            "label": "Estrés/entrenamiento intenso",
            "value": "estres_ejercicio"
          },
          {
            "label": "Cambio de peso importante",
            "value": "cambio_peso"
          }
        ]
    },
    { "id": "P1_no_cycle_desde_cuando",
        "type": "single_choice",
        "title": "¿Desde cuándo no hay sangrado? 📆",
        "help_text": "Aporta contexto sobre tu caso.",
        "visible_if": {
          "question_id": "P1",
          "equals": "No tengo sangrado actualmente"
        },
        "options": [
          {
            "label": "Menos de 3 meses",
            "value": "<3m"
          },
          {
            "label": "3–6 meses",
            "value": "3–6m"
          },
          {
            "label": "Más de 6 meses",
            "value": ">6m"
          }
        ]
    },
    { "id": "P2",
      "type": "multi_select",
      "title": "En los últimos 3 ciclos, ¿qué síntomas aplican? 🩸",
      "help_text": "Selecciona hasta 3. Si es abundante, elige el tipo que mejor lo describe.",
      "options": [
        { "label": "Manchado entre reglas (spotting)", "value": "Manchado entre reglas" },
        { "label": "Sangrado después de relaciones", "value": "Sangrado después de relaciones" },
        { "label": "Sangrado abundante (rojo brillante, sensación de calor/sed/irritabilidad)", "value": "Sangrado abundante (rojo brillante, sensación de calor/sed/irritabilidad)" },
        { "label": "Sangrado abundante (prolongado, con coágulos/espeso, sensación de pesadez)", "value": "Sangrado abundante (prolongado, con coágulos/espeso, sensación de pesadez)" },
        { "label": "Sangrado escaso o ausente", "value": "Sangrado escaso o ausente" },
        { "label": "Dolor o cólicos", "value": "Dolor o cólicos" },
        { "label": "Cambios de humor / ansiedad", "value": "Cambios de humor / ansiedad" },
        { "label": "Hinchazón o retención de líquidos", "value": "Hinchazón o retención de líquidos" },
        { "label": "Fatiga o cansancio extremo", "value": "Fatiga o cansancio extremo" },
        { "label": "Ninguna de las anteriores", "value": "Ninguna de las anteriores" }
      ],
      "validation": { "min_selected": 0, "max_selected": 3 },
      "modes": ["regular","pro"]
    },
    { "id": "P2_spotting_frecuencia",
      "type": "single_choice",
      "title": "Si tuviste manchado, ¿con qué frecuencia? 📍",
      "help_text": "Opcional (afina lectura).",
      "visible_if": { "question_id": "P2", "includes": ["Manchado entre reglas"] },
      "options": [
        { "label": "1–2 veces / 3 ciclos", "value": "spot_ocasional" },
        { "label": "3–4 veces / 3 ciclos", "value": "spot_a_veces" },
        { "label": "≥5 veces / 3 ciclos", "value": "spot_frecuente" }
      ],
      "modes": ["pro"]
    },
    { "id": "P2_spotting_context",
      "type": "single_choice",
      "title": "En días con manchado, ¿hubo calor/irritabilidad? 🌡️",
      "help_text": "Opcional. Identifica contexto de calor.",
      "visible_if": { "question_id": "P2", "includes": ["Manchado entre reglas"] },
      "options": [
        { "label": "Sí, calor o irritabilidad", "value": "si_calor_irritabilidad" },
        { "label": "No", "value": "no" },
        { "label": "No estoy segura", "value": "no_seguro" }
      ],
      "modes": ["pro"]
    },
    { "id": "P2_margen_calor_humedad",
      "type": "single_choice",
      "title": "Si es rojo brillante y con coágulos, ¿qué sientes más? 🌡️/💧",
      "help_text": "Nos ayuda a diferenciar si predomina el calor o la retención.",
      "visible_if": {
        "all": [
          { "question_id": "P2_color", "equals": "rojo_brillante" },
          { "question_id": "P2_textura", "equals": "coagulos" }
        ]
      },
      "options": [
        { "label": "Calor/sed predominante", "value": "calor_sed" },
        { "label": "Pesadez/hinchazón predominante", "value": "pesadez_hinchazon" },
        { "label": "Ambas por igual", "value": "ambas" },
        { "label": "Ninguna / no estoy segura", "value": "ninguna" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P2b_margen_calor_humedad",
      "type": "single_choice",
      "title": "Si es rojo oscuro y abundante, ¿qué sientes más? 🌡️/💧",
      "help_text": "Nos ayuda a diferenciar si predomina el calor o la retención.",
      "visible_if": {
        "all": [
          { "question_id": "P2_color", "equals": "rojo_oscuro" },
          { "question_id": "P2_cantidad", "at_least": 7 }
        ]
      },
      "options": [
        { "label": "Calor/sed predominante", "value": "calor_sed" },
        { "label": "Pesadez/hinchazón predominante", "value": "pesadez_hinchazon" },
        { "label": "Ambas por igual", "value": "ambas" },
        { "label": "Ninguna / no estoy segura", "value": "ninguna" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P2_escaso_frecuencia",
      "type": "single_choice",
      "title": "Si el sangrado es escaso/ausente, ¿con qué frecuencia? 🌵",
      "visible_if": {
        "all": [
          { "question_id": "P2", "includes": ["Sangrado escaso o ausente"] },
          { "question_id": "P1", "equals": "Irregular (varía >7 días entre ciclos)" }
        ]
      },
      "options": [
        { "label": "Algunos ciclos", "value": "algunos_ciclos" },
        { "label": "Casi siempre", "value": "casi_siempre" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P2_hinchazon_severidad",
      "type": "slider",
      "title": "Hinchazón/retención: ¿qué tanto? 💧",
      "visible_if": { "question_id": "P2", "includes": ["Hinchazón o retención de líquidos"] },
      "min": 0,
      "max": 10,
      "step": 1,
      "modes": ["regular","pro"]
    },
    { "id": "P2_fatiga_severidad",
      "type": "slider",
      "title": "¿Qué tan fuerte fue la fatiga? 🥱",
      "visible_if": { "question_id": "P2", "includes": ["Fatiga o cansancio extremo"] },
      "min": 0,
      "max": 10,
      "step": 1,
      "modes": ["regular","pro"]
    },
    { "id": "P2_animo_severidad",
      "type": "slider",
      "title": "Cambios de ánimo/ansiedad: ¿qué tanto? 💛",
      "visible_if": { "question_id": "P2", "includes": ["Cambios de humor / ansiedad"] },
      "min": 0,
      "max": 10,
      "step": 1,
      "modes": ["regular","pro"]
    },
    { "id": "P2_periodo_calidad",
    "type": "compound",
    "title": "Calidad del sangrado menstrual 🌹",
    "help_text": "Responde según tus días más intensos.",
    "items": [
    { "id": "P2_cantidad",
      "type": "slider",
      "title": "¿Qué tanta cantidad de sangrado hay en tus días más intensos? 📊",
      "help_text": "0 = casi nada; 10 = empapa con facilidad.",
      "min": 0,
      "max": 10,
      "step": 1,
      "tick_marks": [0,3,6,8,10],
      "tick_labels": { "0": "0", "3": "3", "6": "6", "8": "8", "10": "10" },
      "aria_label": "Cantidad de sangrado de 0 a 10",
      "modes": ["regular","pro"]
    },
    { "id": "P2_color",
      "type": "single_choice",
      "title": "Color predominante en días intensos 🎨",
      "help_text": "Elige el que más se acerque.",
      "options": [
        { "label": "Rojo brillante", "value": "rojo_brillante" },
        { "label": "Rojo oscuro", "value": "rojo_oscuro" },
        { "label": "Marrón (al inicio o al final)", "value": "marron" },
        { "label": "Rosa / aguado", "value": "rosa_aguado" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P2_textura",
      "type": "multi_select",
      "title": "Textura del flujo en días intensos 🧪",
      "help_text": "Puedes elegir más de una.",
      "options": [
        { "label": "Con coágulos", "value": "coagulos" },
        { "label": "Fluido aguado", "value": "aguado" }
      ],
      "validation": { "min_selected": 1, "max_selected": 2 },
      "modes": ["regular","pro"]
    },
    { "id": "P2_coagulo_tamano",
      "type": "single_choice",
      "title": "Si hay coágulos, ¿qué tamaño? 🧈",
      "help_text": "Aproximado.",
      "visible_if": { "question_id": "P2_textura", "includes": ["coagulos"] },
      "options": [
        { "label": "Pequeños (<1 cm)", "value": "<1cm" },
        { "label": "Medianos (1–2.4 cm)", "value": "1–2.4cm" },
        { "label": "Grandes (>2.4 cm)", "value": ">2.4cm" }
      ],
      "modes": ["pro"]
    },
    { "id": "P2_productos_por_dia",
      "type": "single_choice",
      "title": "En días intensos, ¿cuántos productos usas/día? 🧻",
      "help_text": "Ayuda a estimar el volumen.",
      "options": [
        { "label": "1–3", "value": "1–3" },
        { "label": "4–6", "value": "4–6" },
        { "label": "7 o más", "value": ">=7" }
      ],
      "modes": ["regular","pro"]
    },
    ],
    },
    { "id": "P2_abundancia",
      "type": "single_choice",
      "title": "Si es abundante, ¿cada cuánto cambias toalla/tampón? ⏳",
      "help_text": "Se muestra si marcaste abundante o si tu cantidad es alta.",
      "visible_if": {
        "any": [
          {
            "question_id": "P2",
            "includes_any": [
              "Sangrado abundante (rojo brillante, sensación de calor/sed/irritabilidad)",
              "Sangrado abundante (prolongado, con coágulos/espeso, sensación de pesadez)"
            ]
          },
          { "question_id": "P2_cantidad", "at_least": 7 }
        ]
      },
      "options": [
        { "label": "Más de 3 horas", "value": ">3h" },
        { "label": "Cada 2–3 horas", "value": "2–3h" },
        { "label": "Menos de 1 hora", "value": "<1h" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P2c_dolor_bloque",
  "type": "grouped",
  "title": "Cuando tuviste dolor o cólicos:",
  "visible_if": { "question_id": "P2", "includes": ["Dolor o cólicos"] },
  "questions": [
    {
      "id": "P2q_dolor_severidad",
      "type": "slider",
      "title": "¿Qué tan intensos fueron tus cólicos? 🌪️",
      "help_text": "0 = nada; 10 = muy intensos.",
      "min": 0,
      "max": 10,
      "step": 1,
      "tick_marks": [0,3,6,8,10],
      "tick_labels": { "0": "0", "3": "3", "6": "6", "8": "8", "10": "10" },
      "aria_label": "Intensidad de cólicos de 0 a 10"
    },
    {
      "id": "P2q_dolor_alivio",
      "type": "single_choice",
      "title": "¿Qué te alivia más el dolor? ☕🧘‍♀️",
      "help_text": "Elige una opción.",
      "options": [
        { "label": "Calor local (bolsa tibia)", "value": "Calor local" },
        { "label": "Movimiento / estiramiento", "value": "Movimiento / estiramiento" },
        { "label": "Descanso / presión", "value": "Descanso / presión" },
        { "label": "Frío local (compresa fría)", "value": "Frío local" }
      ]
    },
    {
      "id": "P2q_dolor_empeora",
      "type": "multi_select",
      "title": "¿Qué empeora tus cólicos? (elige hasta 2) ⚠️",
      "help_text": "Puedes seleccionar hasta dos opciones.",
      "options": [
        { "label": "Calor ambiental", "value": "Calor ambiental" },
        { "label": "Frío ambiental", "value": "Frío ambiental" },
        { "label": "Inactividad / sedentarismo prolongado", "value": "Inactividad / sedentarismo prolongado" },
        { "label": "Movimiento intenso / esfuerzo", "value": "Movimiento intenso / esfuerzo" },
        { "label": "Estrés o tensión emocional", "value": "Estrés o tensión emocional" },
        { "label": "Comidas pesadas/saladas que dan hinchazón", "value": "Comidas pesadas/saladas que dan hinchazón" },
        { "label": "Día 1–2 del periodo", "value": "Día 1–2 del periodo" },
        { "label": "Nada en particular", "value": "Nada en particular" }
      ],
      "validation": { "min_selected": 0, "max_selected": 2 }
    }
  ],
  "modes": ["regular","pro"]
    },
    {"id": "P3",
      "type": "multi_select",
      "title": "Señales del cuerpo que notas (últimos 3 ciclos) 🧭",
      "help_text": "Selecciona hasta 3.",
      "options": [
        { "label": "Calor/enrojecimiento", "value": "Calor, enrojecimiento" },
        { "label": "Frío en manos/pies", "value": "Frío en manos/pies" },
        { "label": "Lengua hinchada (bordes marcados)", "value": "Lengua hinchada" },
        { "label": "Lengua pálida", "value": "Lengua pálida" },
        { "label": "Punta de la lengua roja", "value": "Punta de la lengua roja" },
        { "label": "Hinchazón, pesadez, retención", "value": "Hinchazón, pesadez, retención" },
        { "label": "Sequedad (piel, mucosas)", "value": "Sequedad (piel, mucosas)" },
        { "label": "Ninguna de las anteriores", "value": "Ninguna de las anteriores" }
      ],
      "validation": { "min_selected": 0, "max_selected": 3 },
      "modes": ["regular","pro"]
    },
    { "id": "P3_hinchazon_modificador",
      "type": "single_choice",
      "title": "Si hay pesadez/hinchazón, ¿cómo cambia con el movimiento? 🚶‍♀️",
      "help_text": "Opcional.",
      "visible_if": { "question_id": "P3", "includes": ["Hinchazón, pesadez, retención"] },
      "options": [
        { "label": "Mejora con movimiento", "value": "mejora_con_movimiento" },
        { "label": "Empeora con sedentarismo", "value": "empeora_con_sedentarismo" },
        { "label": "No noto diferencia", "value": "sin_cambio" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P3_quick_test_frio_sequedad",
      "type": "single_choice",
      "title": "Si no marcaste Frío o Sequedad, ¿con cuál te identificas más? 🧊🌵",
      "help_text": "Opcional. Úsala si te cuesta decidir.",
      "visible_if": {
        "all": [
          {
            "question_id": "P3",
            "not_includes_any": [
              "Frío en manos/pies",
              "Lengua pálida",
              "Sequedad (piel, mucosas)"
            ]
          }
        ]
      },
      "options": [
        { "label": "Frío: manos/pies fríos, sensibilidad a climas fríos", "value": "frio_signs" },
        { "label": "Sequedad: piel/mucosas secas, sed al final del día", "value": "sequedad_signs" },
        { "label": "Ninguna / no aplica", "value": "ninguna" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P4",
      "type": "multi_select",
      "title": "Estados emocionales (últimos 3 ciclos) 💬",
      "help_text": "Selecciona hasta 2.",
      "options": [
        { "label": "Ansiedad", "value": "Ansiedad" },
        { "label": "Irritabilidad", "value": "Irritabilidad" },
        { "label": "Tristeza", "value": "Tristeza" },
        { "label": "Apatía", "value": "Apatía" },
        { "label": "Agotamiento, burnout", "value": "Agotamiento, burnout" },
        { "label": "Ninguna de las anteriores", "value": "Ninguna de las anteriores" }
      ],
      "validation": { "min_selected": 0, "max_selected": 2 },
      "modes": ["regular","pro"]
    },
    { "id": "P5",
      "type": "multi_select",
      "title": "Antojos o preferencias de alimentos 🍫🍜🍉",
      "help_text": "Elige todos los que apliquen.",
      "options": [
        { "label": "Dulce simple (refinados)", "value": "P5_dulce_simple" },
        { "label": "Carbohidratos complejos", "value": "P5_carbo_complejos" },
        { "label": "Salado", "value": "P5_salado" },
        { "label": "Picante", "value": "P5_picante" },
        { "label": "Alimentos fríos / hielo", "value": "P5_frio_hielo" },
        { "label": "Caldos, sopas o tés calientes", "value": "P5_caliente" },
        { "label": "Frutas jugosas o alimentos húmedos", "value": "P5_jugoso" }
      ],
      "validation": { "min_selected": 0 },
      "value_map": [
        { "value": "P5_dulce_simple", "score_key": "Dulce simple" },
        { "value": "P5_carbo_complejos", "score_key": "Carbohidratos complejos" },
        { "value": "P5_salado", "score_key": "Salado" },
        { "value": "P5_picante", "score_key": "Picante" },
        { "value": "P5_frio_hielo", "score_key": "Alimentos fríos / hielo" },
        { "value": "P5_caliente", "score_key": "Caldos, sopas o tés calientes" },
        { "value": "P5_jugoso", "score_key": "Frutas jugosas o alimentos húmedos" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P5b_preferencia_termica_bebidas",
      "type": "single_choice",
      "title": "Cuando tienes sed, ¿qué prefieres? 🧊🔥",
      "help_text": "Señal útil de tu terreno.",
      "options": [
        { "label": "Bebidas frías / con hielo", "value": "bebidas_frias" },
        { "label": "Bebidas tibias o calientes", "value": "bebidas_calientes" },
        { "label": "Depende / no tengo preferencia", "value": "neutro" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P6",
      "type": "multi_select",
      "title": "Tu patrón de energía general ⚡",
      "help_text": "Selecciona hasta 2.",
      "options": [
        { "label": "Ansiosa, con subidas y bajadas", "value": "Ansiosa, con subidas y bajadas" },
        { "label": "Ráfagas de energía", "value": "Ráfagas de energía" },
        { "label": "Lenta, pesada, con poca motivación", "value": "Lenta, pesada, con poca motivación" },
        { "label": "Agotada, drenada", "value": "Agotada, drenada" },
        { "label": "Ninguna de las anteriores", "value": "Ninguna de las anteriores" }
      ],
      "validation": { "min_selected": 0, "max_selected": 2 },
      "modes": ["regular","pro"]
    },
    { "id": "P7",
        "type": "single_choice",
        "title": "¿Cuándo se intensifican más tus síntomas? 🗓️",
        "help_text": "Elige la fase.",
        "options": [
          {
            "label": "Antes del periodo (PMS)",
            "value": "antes"
          },
          {
            "label": "Durante el periodo",
            "value": "durante"
          },
          {
            "label": "Después del periodo",
            "value": "después"
          },
          {
            "label": "Entre periodos",
            "value": "entre"
          }
        ]
      },
      { "id": "P7_durante",
        "type": "multi_select",
        "title": "¿Qué días del periodo son más intensos? 🔎",
        "help_text": "Selecciona todos los días. (1 = primer día del sangrado)",
        "visible_if": {
          "question_id": "P7",
          "equals": "durante"
        },
        "options": [
          {
            "label": "Día 1",
            "value": "1"
          },
          {
            "label": "Día 2",
            "value": "2"
          },
          {
            "label": "Día 3",
            "value": "3"
          },
          {
            "label": "Día 4",
            "value": "4"
          },
          {
            "label": "Día 5",
            "value": "5"
          },
          {
            "label": "Día 6",
            "value": "6"
          },
          {
            "label": "Día 7",
            "value": "7"
          }
        ],
        "validation": {
          "min_selected": 0,
          "max_selected": 7
        }
      },
    { "id": "P8_signos_corporales",
      "type": "multi_select",
      "title": "Señales del cuerpo (opcional) 🧩",
      "help_text": "Si no viste tus señales arriba, selecciona hasta 3.",
      "visible_if": {
        "any": [
          { "question_id": "P2", "includes": ["Ninguna de las anteriores"] },
          { "question_id": "P3", "includes": ["Ninguna de las anteriores"] }
        ]
      },
      "options": [
        { "label": "Sed intensa la mayor parte del día", "value": "Sed intensa" },
        { "label": "Piel muy seca", "value": "Piel muy seca" },
        { "label": "Sudor pegajoso", "value": "Sudor pegajoso" },
        { "label": "Poco o nada de sudor incluso con calor", "value": "Poco sudor con calor" }
      ],
      "validation": { "min_selected": 0, "max_selected": 3 },
      "modes": ["regular","pro"]
    },
    { "id": "P8_sequedad_detalle",
      "type": "multi_select",
      "title": "Si notas sequedad, ¿dónde lo sientes más? (opcional) 🌵",
      "visible_if": {
        "any": [
          { "question_id": "P3", "includes": ["Sequedad (piel, mucosas)"] },
          { "question_id": "P2", "includes": ["Sangrado escaso o ausente", "Fatiga o cansancio extremo"] }
        ]
      },
      "options": [
        { "label": "Boca seca", "value": "boca_seca" },
        { "label": "Ojos secos", "value": "ojos_secos" },
        { "label": "Lubricación vaginal baja", "value": "lubricacion_baja" },
        { "label": "Sed nocturna", "value": "sed_nocturna" },
        { "label": "Piel muy seca", "value": "piel_muy_seca" }
      ],
      "validation": {
        "min_selected": 0,
        "max_selected": 5,
        "soft_required_when": {
          "all": [
            { "question_id": "P2", "includes": ["Sangrado escaso o ausente"] },
            { "question_id": "P5b_preferencia_termica_bebidas", "equals": "bebidas_calientes" }
          ],
          "message": "Ayúdanos a precisar señales de sequedad: ¿boca/ojos/vagina seca o sed nocturna?"
        }
      },
      "modes": ["regular","pro"]
    },
    {"id": "P8_que_alivia_sequedad",
      "type": "multi_select",
      "title": "Cuando hay sequedad, ¿qué te alivia? 💦 (opcional)",
      "visible_if": {
        "any": [
          { "question_id": "P3", "includes": ["Sequedad (piel, mucosas)"] },
          { "question_id": "P2", "includes": ["Sangrado escaso o ausente", "Fatiga o cansancio extremo"] }
        ]
      },
      "options": [
        { "label": "Sopas o caldos", "value": "sopas_caldos" },
        { "label": "Frutas jugosas", "value": "frutas_jugosas" },
        { "label": "Grasas saludables", "value": "grasas_saludables" },
        { "label": "Agua con electrolitos", "value": "agua_electrolitos" }
      ],
      "validation": { "min_selected": 0, "max_selected": 4 },
      "modes": ["pro"]
    },
    { "id": "P8_contexto_sequedad",
      "type": "multi_select",
      "title": "¿Qué empeora tu sequedad? 🌬️ (opcional)",
      "options": [
        { "label": "Clima muy seco", "value": "clima_seco" },
        { "label": "Aire acondicionado prolongado", "value": "aire_acondicionado" },
        { "label": "Altitud", "value": "altitud" },
        { "label": "Viajes frecuentes", "value": "viajes_frecuentes" }
      ],
      "validation": { "min_selected": 0, "max_selected": 4 },
      "modes": ["pro"]
    },
    { "id": "P9_sueno_calidad",
      "type": "slider",
      "title": "Calidad de sueño (últimos 7 días) 😴",
      "help_text": "0 = pésima; 10 = excelente.",
      "min": 0,
      "max": 10,
      "step": 1,
      "modes": ["pro"]
    },
    { "id": "P9_estres",
      "type": "slider",
      "title": "Estrés percibido (últimos 7 días) 😵‍💫",
      "help_text": "0 = nada; 10 = muy alto.",
      "min": 0,
      "max": 10,
      "step": 1,
      "modes": ["regular","pro"]
    },
    { "id": "P9_ejercicio",
      "type": "single_choice",
      "title": "Ejercicio/actividad física semanal 🏃‍♀️",
      "help_text": "Selecciona la opción que más se acerque.",
      "options": [
        { "label": "Ninguno", "value": "ninguno" },
        { "label": "1–2 días/semana", "value": "1–2_dias_sem" },
        { "label": "3–5 días/semana", "value": "3–5_dias_sem" },
        { "label": "6–7 días/semana", "value": "6–7_dias_sem" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P9_cafeina",
      "type": "single_choice",
      "title": "¿Cuánta cafeína tomas al día? ☕",
      "help_text": "Cafés/energéticas/tés fuertes.",
      "options": [
        { "label": "0", "value": "0" },
        { "label": "1", "value": "1" },
        { "label": "2", "value": "2" },
        { "label": "3 o más", "value": "3+" }
      ],
      "modes": ["regular","pro"]
    },
    { "id": "P9_alcohol",
      "type": "single_choice",
      "title": "¿Cuántas bebidas alcohólicas por semana? 🍷",
      "help_text": "Aproximado.",
      "options": [
        { "label": "Ninguna", "value": "0_sem" },
        { "label": "1–3 por semana", "value": "1–3_sem" },
        { "label": "4 o más por semana", "value": ">=4_sem" }
      ],
      "modes": ["pro"]
    }
  ],

const SURVEY_QUESTION_ORDER = [
  "question_order": [
  "P0_contraception",
  "P1",
  "P1_motivo_no_ciclo",
  "P1_amenorrea_contexto",
  "P1_onset_timing", 
  "P1_no_cycle_desde_cuando",
  "P2",
  "P2_spotting_frecuencia",
  "P2_spotting_context",
  "P2_margen_calor_humedad",
  "P2b_margen_calor_humedad",
  "P2_escaso_frecuencia",
  "P2_hinchazon_severidad",
  "P2_fatiga_severidad",
  "P2_animo_severidad",
  "P2_periodo_calidad",
  "P2_abundancia", 
  "P2c_dolor_bloque",
  "P3",
  "P3_hinchazon_modificador",
  "P3_quick_test_frio_sequedad",
  "P4",
  "P7",         // ← P7 now comes before P5
  "P7_durante",
  "P5",         // ← P5 now comes after P7
  "P5b_preferencia_termica_bebidas",
  "P6",
  "P8_signos_corporales",
  "P8_sequedad_detalle",
  "P8_que_alivia_sequedad",
  "P8_contexto_sequedad",
  "P9_sueno_calidad",
  "P9_estres",
  "P9_ejercicio",
  "P9_cafeina",
  "P9_alcohol"
],


// Element Patterns
const ELEMENT_PATTERNS = {
    tension: {
        element: 'Viento/Aire 🌬️',
        pattern: 'Exceso de Viento con espasmo uterino y nervioso',
        characteristics: [
            'Dolor cólico o punzante (espasmos)',
            'Síntomas irregulares/cambiantes',
            'Ansiedad, hipervigilancia',
            'Sensibilidad al estrés',
            'Respiración entrecortada con dolor'
        ]
    },
    calor: {
        element: 'Fuego 🔥',
        pattern: 'Exceso de Fuego: calor interno, sangrado abundante, irritabilidad',
        characteristics: [
            'Flujo rojo brillante/abundante',
            'Sensación de calor/sed/enrojecimiento',
            'Irritabilidad premenstrual',
            'Sueño ligero',
            'Digestión rápida/acidez'
        ]
    },
    humedad: {
        element: 'Tierra/Agua 💧',
        pattern: 'Exceso de Humedad: pesadez, retención, coágulos',
        characteristics: [
            'Hinchazón/pesadez',
            'Coágulos o flujo espeso',
            'Digestión lenta de grasas',
            'Letargo postcomida',
            'Mejoría con movimiento suave'
        ]
    },
    sequedad: {
        element: 'Agua Deficiente 🌵',
        pattern: 'Deficiencia de Agua: flujo escaso, piel/mucosas secas, fatiga',
        characteristics: [
            'Sangrado muy escaso o ausente',
            'Sed y sequedad',
            'Cansancio, sueño no reparador',
            'Rigidez articular',
            'Irritabilidad por agotamiento'
        ]
    }
};

// Application State
let currentQuestionIndex = 0;
let surveyResponses = {};
let calculatedElement = null;
let userId = null;

// DOM Elements
const pages = {
    landing: document.getElementById('landing-page'),
    survey: document.getElementById('survey-page'),
    results: document.getElementById('results-page'),
    email: document.getElementById('email-page'),
    waitlist: document.getElementById('waitlist-page'),
    loading: document.getElementById('loading-screen')
};

const elements = {
    startQuiz: document.getElementById('start-quiz'),
    surveyContent: document.getElementById('survey-content'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    resultsContent: document.getElementById('results-content'),
    emailForm: document.getElementById('email-form'),
    waitlistForm: document.getElementById('waitlist-form'),
    waitlistSuccess: document.getElementById('waitlist-success')
};

// Utility Functions
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showPage(pageName) {
    Object.values(pages).forEach(page => {
        if (page) page.classList.remove('active');
    });
    if (pages[pageName]) {
        pages[pageName].classList.add('active');
    }
}

function showLoading(show = true) {
    if (show) {
        pages.loading.classList.add('active');
    } else {
        pages.loading.classList.remove('active');
    }
}

// Survey Logic
function renderQuestion(questionIndex) {
    const question = SURVEY_QUESTIONS[questionIndex];
    if (!question) return;

    let optionsHtml = '';
    
    if (question.type === 'single_choice') {
        optionsHtml = question.options.map(option => `
            <div class="survey-option" data-value="${option.value}">
                <input type="radio" name="${question.id}" value="${option.value}" id="${question.id}_${option.value}">
                <label for="${question.id}_${option.value}">${option.label}</label>
            </div>
        `).join('');
    } else if (question.type === 'multi_select') {
        optionsHtml = question.options.map(option => `
            <div class="survey-option" data-value="${option.value}">
                <input type="checkbox" name="${question.id}" value="${option.value}" id="${question.id}_${option.value}">
                <label for="${question.id}_${option.value}">${option.label}</label>
            </div>
        `).join('');
    }

    elements.surveyContent.innerHTML = `
        <div class="survey-question">
            <h2 class="question-title">${question.title}</h2>
            <div class="survey-options">
                ${optionsHtml}
            </div>
        </div>
    `;

    // Add click handlers to options
    const optionElements = elements.surveyContent.querySelectorAll('.survey-option');
    optionElements.forEach(option => {
        option.addEventListener('click', (e) => {
            const input = option.querySelector('input');
            if (question.type === 'single_choice') {
                // Clear other selections
                optionElements.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                input.checked = true;
            } else if (question.type === 'multi_select') {
                // Handle max selection limit
                if (question.max_selected) {
                    const checkedCount = elements.surveyContent.querySelectorAll('input[type="checkbox"]:checked').length;
                    if (!input.checked && checkedCount >= question.max_selected) {
                        e.preventDefault();
                        return;
                    }
                }
                option.classList.toggle('selected');
                input.checked = !input.checked;
            }
            updateNextButtonState();
        });
    });

    updateProgressBar();
    updateNavigationButtons();
    updateNextButtonState();
}

function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / SURVEY_QUESTIONS.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.progressText.textContent = `Pregunta ${currentQuestionIndex + 1} de ${SURVEY_QUESTIONS.length}`;
}

function updateNavigationButtons() {
    elements.prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    elements.nextBtn.textContent = currentQuestionIndex === SURVEY_QUESTIONS.length - 1 ? 'Finalizar' : 'Siguiente';
}

function updateNextButtonState() {
    const question = SURVEY_QUESTIONS[currentQuestionIndex];
    const inputs = elements.surveyContent.querySelectorAll('input');
    const hasSelection = Array.from(inputs).some(input => input.checked);
    elements.nextBtn.disabled = !hasSelection;
}

function collectCurrentResponse() {
    const question = SURVEY_QUESTIONS[currentQuestionIndex];
    const inputs = elements.surveyContent.querySelectorAll('input:checked');
    
    if (question.type === 'single_choice') {
        surveyResponses[question.id] = inputs[0]?.value || null;
    } else if (question.type === 'multi_select') {
        surveyResponses[question.id] = Array.from(inputs).map(input => input.value);
    }
}

// Element Calculation Logic
function calculateElement() {
    let scores = {
        tension: 0,
        calor: 0,
        humedad: 0,
        sequedad: 0
    };

    // Scoring based on responses
    const responses = surveyResponses;

    // P2 symptoms scoring
    if (responses.P2 && Array.isArray(responses.P2)) {
        responses.P2.forEach(symptom => {
            if (symptom.includes('Dolor o cólicos') || symptom.includes('Cambios de humor / ansiedad')) {
                scores.tension += 2;
            }
            if (symptom.includes('rojo brillante') || symptom.includes('calor/sed/irritabilidad')) {
                scores.calor += 3;
            }
            if (symptom.includes('coágulos/espeso') || symptom.includes('Hinchazón') || symptom.includes('pesadez')) {
                scores.humedad += 3;
            }
            if (symptom.includes('escaso o ausente')) {
                scores.sequedad += 3;
            }
            if (symptom.includes('Fatiga')) {
                scores.sequedad += 1;
                scores.tension += 1;
            }
        });
    }

    // P3 physical signs scoring
    if (responses.P3 && Array.isArray(responses.P3)) {
        responses.P3.forEach(sign => {
            if (sign.includes('Calor, enrojecimiento') || sign.includes('Punta de la lengua roja')) {
                scores.calor += 2;
            }
            if (sign.includes('Frío') || sign.includes('Lengua pálida') || sign.includes('Sequedad')) {
                scores.sequedad += 2;
            }
            if (sign.includes('Lengua hinchada') || sign.includes('Hinchazón, pesadez, retención')) {
                scores.humedad += 2;
            }
        });
    }

    // Determine dominant element
    const maxScore = Math.max(...Object.values(scores));
    const dominantElements = Object.keys(scores).filter(key => scores[key] === maxScore);
    
    // If tie, use priority order: calor > humedad > sequedad > tension
    const priority = ['calor', 'humedad', 'sequedad', 'tension'];
    for (const element of priority) {
        if (dominantElements.includes(element)) {
            return element;
        }
    }
    
    return 'tension'; // default
}

function renderResults() {
    const elementKey = calculatedElement;
    const elementData = ELEMENT_PATTERNS[elementKey];
    
    if (!elementData) {
        console.error('Element data not found for:', elementKey);
        return;
    }

    const characteristicsList = elementData.characteristics
        .map(char => `<li>${char}</li>`)
        .join('');

    elements.resultsContent.innerHTML = `
        <div class="element-result">
            <div class="result-element">${elementData.element}</div>
            <h3 class="result-pattern">${elementData.pattern}</h3>
            <ul class="characteristics-list">
                ${characteristicsList}
            </ul>
            <div class="results-actions">
                <button id="get-full-results" class="btn btn--primary btn--lg">
                    Obtener resultados completos por email
                </button>
                <button id="join-waitlist" class="btn btn--secondary btn--lg" style="margin-top: 16px;">
                    Toma la versión PRO
                </button>
            </div>
        </div>
        
        <div class="disclaimer">
            <p><strong>Nota importante:</strong> Esta evaluación es orientativa y no sustituye el consejo médico profesional. Consulta siempre con un profesional de la salud para cualquier problema menstrual.</p>
        </div>
    `;

    // Add event listeners
    document.getElementById('get-full-results').addEventListener('click', () => {
        showPage('email');
    });
    
    document.getElementById('join-waitlist').addEventListener('click', () => {
        showPage('waitlist');
    });
}

// Data Persistence
async function saveToSupabase(data) {
    try {
        const { error } = await supabase
            .from('survey_responses')
            .insert([{
                user_id: userId,
                responses: surveyResponses,
                calculated_element: calculatedElement,
                timestamp: new Date().toISOString(),
                ...data
            }]);
        
        if (error) {
            console.error('Supabase error:', error);
        } else {
            console.log('Data saved to Supabase successfully');
        }
    } catch (error) {
        console.error('Error saving to Supabase:', error);
    }
}

// Email Functions
async function sendResultsEmail(name, email) {
    const elementData = ELEMENT_PATTERNS[calculatedElement];
    
    const emailContent = `
        <h2>Tu Perfil Energético - ${elementData.element}</h2>
        <h3>${elementData.pattern}</h3>
        
        <h4>Características de tu patrón:</h4>
        <ul>
            ${elementData.characteristics.map(char => `<li>${char}</li>`).join('')}
        </ul>
        
        <h4>Recomendaciones personalizadas:</h4>
        <p>Basado en tu perfil ${elementData.element}, te recomendamos:</p>
        <ul>
            <li>Observar tus patrones durante los próximos 2-3 ciclos</li>
            <li>Llevar un diario de síntomas y emociones</li>
            <li>Considerar prácticas que equilibren tu elemento dominante</li>
        </ul>
        
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
            <h4>🌟 Únete a la lista de espera</h4>
            <p>Recibe acceso temprano al primer sistema de herbolaria personalizada para tu ciclo menstrual en México.</p>
            <ul>
                <li>💰 Descuento de miembro fundador</li>
                <li>🔔 Notificaciones de lanzamiento</li>
                <li>🎯 Acceso prioritario a tu kit personalizado</li>
                <li>📚 Guías gratuitas de salud menstrual</li>
            </ul>
            <p><strong>Lanzamiento previsto: Primavera 2026</strong></p>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
            <strong>Nota importante:</strong> Esta evaluación es orientativa y no sustituye el consejo médico profesional.
        </p>
    `;

    try {
        const response = await fetch(CONFIG.FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                subject: `Tu Perfil Energético - ${elementData.element}`,
                message: emailContent,
                element: elementData.element,
                pattern: elementData.pattern
            })
        });
        
        if (response.ok) {
            console.log('Email sent successfully');
            return true;
        } else {
            console.error('Email sending failed:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

async function joinWaitlist(name, email) {
    try {
        const response = await fetch(CONFIG.WAITLIST_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                timestamp: new Date().toISOString(),
                source: 'survey_app',
                element_type: calculatedElement
            })
        });
        
        if (response.ok) {
            console.log('Waitlist signup successful');
            return true;
        } else {
            console.error('Waitlist signup failed:', response.statusText);
            return false;
        }
    } catch (error) {
        console.error('Error joining waitlist:', error);
        return false;
    }
}

// Event Listeners
function initializeEventListeners() {
    // Start Quiz
    elements.startQuiz.addEventListener('click', () => {
        userId = generateUserId();
        currentQuestionIndex = 0;
        surveyResponses = {};
        showPage('survey');
        renderQuestion(currentQuestionIndex);
    });

    // Navigation
    elements.nextBtn.addEventListener('click', async () => {
        collectCurrentResponse();
        
        if (currentQuestionIndex < SURVEY_QUESTIONS.length - 1) {
            currentQuestionIndex++;
            renderQuestion(currentQuestionIndex);
        } else {
            // Survey complete
            showLoading(true);
            
            // Calculate element
            calculatedElement = calculateElement();
            
            // Save to Supabase
            await saveToSupabase();
            
            // Show results after delay
            setTimeout(() => {
                showLoading(false);
                renderResults();
                showPage('results');
            }, 2000);
        }
    });

    elements.prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            renderQuestion(currentQuestionIndex);
        }
    });

    // Email Form
    elements.emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        
        if (!name || !email) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        showLoading(true);
        
        // Send email and save user data
        const emailSent = await sendResultsEmail(name, email);
        await saveToSupabase({ name, email, email_sent: emailSent });
        
        showLoading(false);
        
        if (emailSent) {
            alert('¡Resultados enviados! Revisa tu bandeja de entrada.');
            showPage('waitlist');
        } else {
            alert('Hubo un problema al enviar el email. Por favor, intenta de nuevo.');
        }
    });

    // Waitlist Form
    elements.waitlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        
        if (!name || !email) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        showLoading(true);
        
        const success = await joinWaitlist(name, email);
        await saveToSupabase({ waitlist_name: name, waitlist_email: email, waitlist_joined: success });
        
        showLoading(false);
        
        if (success) {
            elements.waitlistForm.style.display = 'none';
            elements.waitlistSuccess.style.display = 'block';
        } else {
            alert('Hubo un problema al unirte a la lista de espera. Por favor, intenta de nuevo.');
        }
    });
}

// Initialize Application
function initializeApp() {
    // Show landing page by default
    showPage('landing');
    
    // Initialize event listeners
    initializeEventListeners();
    
    console.log('Colita de Rana Survey App initialized');
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);